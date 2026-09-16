import sqlite3
import time
import uuid
from flask import Flask, request, jsonify

app = Flask(__name__)
DB_PATH = "sovereign_outflow.db"

# ────────────────────────────────────────────

# CONSTANTS — UNDER USER CONTROL

# ────────────────────────────────────────────
MIN_AMOUNT          = 10.0
MAX_AMOUNT          = 50000.0
DAILY_CAP           = 100000.0
REVOCATION_WINDOW   = 300        # seconds — 5 minutes
AML_THRESHOLD       = 9500.0
SUPPORTED_ASSETS    = ["USDT", "USDC", "BTC", "ETH"]

# ────────────────────────────────────────────

# DATABASE — MASTER LEDGER INIT

# ────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS withdrawals (
            id          TEXT PRIMARY KEY,
            holder      TEXT NOT NULL,
            amount      REAL NOT NULL,
            asset       TEXT NOT NULL,
            destination TEXT NOT NULL,
            kyc_verified INTEGER NOT NULL,
            status      TEXT NOT NULL DEFAULT 'PENDING',
            aml_flagged INTEGER NOT NULL DEFAULT 0,
            created_at  REAL NOT NULL,
            executed_at REAL
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS revocation_registry (
            id              TEXT PRIMARY KEY,
            withdrawal_id   TEXT NOT NULL,
            reason          TEXT,
            revoked_at      REAL NOT NULL,
            revoked_by      TEXT NOT NULL DEFAULT 'SOVEREIGN_AUTHORITY'
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS daily_outflow (
            date_key    TEXT PRIMARY KEY,
            total       REAL NOT NULL DEFAULT 0.0
        )
    """)

    conn.commit()
    conn.close()

# ────────────────────────────────────────────

# HELPERS

# ────────────────────────────────────────────
def get_today_key():
    return time.strftime("%Y-%m-%d", time.gmtime())

def get_daily_total():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT total FROM daily_outflow WHERE date_key = ?", (get_today_key(),))
    row = c.fetchone()
    conn.close()
    return row[0] if row else 0.0

def update_daily_total(amount):
    key = get_today_key()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO daily_outflow (date_key, total) VALUES (?, ?)
        ON CONFLICT(date_key) DO UPDATE SET total = total + ?
    """, (key, amount, amount))
    conn.commit()
    conn.close()

# ────────────────────────────────────────────

# ROUTE 1 — INITIATE WITHDRAWAL

# ────────────────────────────────────────────
@app.route("/withdraw", methods=["POST"])
def initiate_withdrawal():
    data = request.get_json()

    # Extract fields
    holder      = data.get("holder")
    amount      = data.get("amount")
    asset       = data.get("asset", "").upper()
    destination = data.get("destination")
    kyc         = data.get("kyc_verified", False)

    # ── Validation Gate ──
    if not all([holder, amount, asset, destination]):
        return jsonify({"error": "Missing required fields"}), 400

    if not kyc:
        return jsonify({"error": "KYC verification required"}), 403

    if asset not in SUPPORTED_ASSETS:
        return jsonify({"error": f"Unsupported asset: {asset}"}), 400

    if amount < MIN_AMOUNT:
        return jsonify({"error": f"Amount below minimum ({MIN_AMOUNT})"}), 400

    if amount > MAX_AMOUNT:
        return jsonify({"error": f"Amount exceeds per-transaction maximum ({MAX_AMOUNT})"}), 400

    daily_total = get_daily_total()
    if daily_total + amount > DAILY_CAP:
        return jsonify({
            "error": "Daily outflow cap reached",
            "daily_total": daily_total,
            "cap": DAILY_CAP
        }), 429

    # ── AML Flag ──
    aml_flagged = 1 if amount >= AML_THRESHOLD else 0

    # ── Create Withdrawal Record ──
    withdrawal_id = str(uuid.uuid4())
    now = time.time()

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO withdrawals
        (id, holder, amount, asset, destination, kyc_verified, status, aml_flagged, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    """, (withdrawal_id, holder, amount, asset, destination, int(kyc), aml_flagged, now))
    conn.commit()
    conn.close()

    return jsonify({
        "withdrawal_id": withdrawal_id,
        "status":        "PENDING",
        "aml_flagged":   bool(aml_flagged),
        "message":       "Withdrawal queued. Awaiting master approval."
    }), 201

# ────────────────────────────────────────────

# ROUTE 2 — EXECUTE (MASTER CONTROL APPROVAL)

# ────────────────────────────────────────────
@app.route("/withdraw/<withdrawal_id>/execute", methods=["POST"])
def execute_withdrawal(withdrawal_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM withdrawals WHERE id = ?", (withdrawal_id,))
    row = c.fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Withdrawal not found"}), 404

    status = row[6]

    if status != "PENDING":
        conn.close()
        return jsonify({"error": f"Cannot execute. Current status: {status}"}), 409

    amount = row[2]
    now = time.time()

    c.execute("""
        UPDATE withdrawals SET status = 'EXECUTED', executed_at = ?
        WHERE id = ?
    """, (now, withdrawal_id))
    conn.commit()
    conn.close()

    update_daily_total(amount)

    return jsonify({
        "withdrawal_id": withdrawal_id,
        "status":        "EXECUTED",
        "executed_at":   now,
        "message":       "Sovereign outflow authorised and executed."
    })

# ────────────────────────────────────────────

# ROUTE 3 — REVOKE (MASTER REVOCATION ENGINE)

# ────────────────────────────────────────────
@app.route("/withdraw/<withdrawal_id>/revoke", methods=["POST"])
def revoke_withdrawal(withdrawal_id):
    data   = request.get_json() or {}
    reason = data.get("reason", "No reason provided")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM withdrawals WHERE id = ?", (withdrawal_id,))
    row = c.fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Withdrawal not found"}), 404

    status     = row[6]
    created_at = row[8]
    now        = time.time()

    if status not in ("PENDING", "APPROVED"):
        conn.close()
        return jsonify({"error": f"Cannot revoke. Status is: {status}"}), 409

    if now - created_at > REVOCATION_WINDOW:
        conn.close()
        return jsonify({
            "error": "Revocation window expired",
            "window_seconds": REVOCATION_WINDOW
        }), 403

    # ── Update withdrawal status ──
    c.execute("UPDATE withdrawals SET status = 'REVOKED' WHERE id = ?", (withdrawal_id,))

    # ── Log to revocation registry ──
    rev_id = str(uuid.uuid4())
    c.execute("""
        INSERT INTO revocation_registry (id, withdrawal_id, reason, revoked_at)
        VALUES (?, ?, ?, ?)
    """, (rev_id, withdrawal_id, reason, now))

    conn.commit()
    conn.close()

    return jsonify({
        "revocation_id": rev_id,
        "withdrawal_id": withdrawal_id,
        "status":        "REVOKED",
        "reason":        reason,
        "authority":     "SOVEREIGN_OUTFLOW_AUTHORITY"
    })

# ────────────────────────────────────────────

# ROUTE 4 — LEDGER AUDIT

# ────────────────────────────────────────────
@app.route("/ledger", methods=["GET"])
def ledger():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM withdrawals ORDER BY created_at DESC LIMIT 100")
    rows = c.fetchall()
    conn.close()

    entries = [{
        "id":          r[0],
        "holder":      r[1],
        "amount":      r[2],
        "asset":       r[3],
        "destination": r[4],
        "kyc":         bool(r[5]),
        "status":      r[6],
        "aml_flagged": bool(r[7]),
        "created_at":  r[8],
        "executed_at": r[9]
    } for r in rows]

    return jsonify({
        "count":        len(entries),
        "daily_outflow": get_daily_total(),
        "daily_cap":    DAILY_CAP,
        "ledger":       entries
    })

# ────────────────────────────────────────────

# ROUTE 5 — REVOCATION REGISTRY

# ────────────────────────────────────────────
@app.route("/revocations", methods=["GET"])
def revocations():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM revocation_registry ORDER BY revoked_at DESC")
    rows = c.fetchall()
    conn.close()

    entries = [{
        "revocation_id": r[0],
        "withdrawal_id": r[1],
        "reason":        r[2],
        "revoked_at":    r[3],
        "revoked_by":    r[4]
    } for r in rows]

    return jsonify({"count": len(entries), "revocations": entries})

# ────────────────────────────────────────────

# MASTER CONTROL BOOT

# ────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print("🔐 Sovereign Outflow Authority — ONLINE")
    app.run(host="0.0.0.0", port=8001, debug=False)

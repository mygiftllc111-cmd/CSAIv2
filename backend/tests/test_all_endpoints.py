"""Full integration test for all 21 endpoints."""
import asyncio
import httpx


async def test():
    async with httpx.AsyncClient(base_url="http://localhost:8432") as client:
        P, T = 0, 0

        # === SLICE 1: Auth + DB ===
        print("=== Slice 1: Auth + DB ===")

        T += 1
        r = await client.post(
            "/api/auth/profile",
            json={"name": "太郎", "department": "研修", "join_date": "2026-02"},
        )
        ok = r.status_code == 200 and r.json()["status"] == "pending"
        P += ok
        pid = r.json()["profile_id"]
        print("1.1 POST /api/auth/profile: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.get(
            "/api/auth/status", headers={"Authorization": "Bearer " + pid}
        )
        ok = r.status_code == 200
        P += ok
        print("1.2 GET /api/auth/status: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.post(
            "/api/admin/login", json={"password": "dev-admin-2026!"}
        )
        ok = r.status_code == 200 and r.json()["authenticated"]
        P += ok
        admin_c = {"csai_admin_session": r.json()["session_id"]}
        print("1.3 POST /api/admin/login: " + ("PASS" if ok else "FAIL"))

        T += 1
        r2 = await client.post(
            "/api/admin/login", json={"password": "dev-admin-2026!"}
        )
        r = await client.post(
            "/api/admin/logout",
            cookies={"csai_admin_session": r2.json()["session_id"]},
        )
        ok = r.status_code == 204
        P += ok
        print("1.4 POST /api/admin/logout: " + ("PASS" if ok else "FAIL"))

        # Re-login admin for subsequent tests (previous session may be affected)
        r_fresh = await client.post(
            "/api/admin/login", json={"password": "dev-admin-2026!"}
        )
        admin_c = {"csai_admin_session": r_fresh.json()["session_id"]}

        # Approve user for subsequent tests
        r = await client.put(
            "/api/admin/users/" + pid + "/approve", cookies=admin_c
        )
        assert r.status_code == 200, "Approve failed: " + r.text
        uh = {"Authorization": "Bearer " + r.json()["auth_token"]}

        # === SLICE 2-A: Chat ===
        print("=== Slice 2-A: Chat ===")

        T += 1
        r = await client.post(
            "/api/chat",
            json={"content": "質問です", "input_method": "text"},
            headers=uh,
        )
        ok = r.status_code == 200 and "conversation_id" in r.json()
        P += ok
        cid = r.json()["conversation_id"]
        print("2A.1 POST /api/chat: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.post("/api/conversations/new", headers=uh)
        ok = r.status_code == 200
        P += ok
        print("2A.2 POST /api/conversations/new: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.get("/api/conversations", headers=uh)
        ok = r.status_code == 200 and len(r.json()) >= 2
        P += ok
        print("2A.3 GET /api/conversations: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.get("/api/conversations/" + cid, headers=uh)
        ok = r.status_code == 200 and len(r.json().get("messages", [])) == 2
        P += ok
        print("2A.4 GET /api/conversations/:id: " + ("PASS" if ok else "FAIL"))

        # === SLICE 2-B: Admin Users ===
        print("=== Slice 2-B: Admin Users ===")

        await client.post(
            "/api/auth/profile",
            json={"name": "花子", "department": "営業", "join_date": "2026-03"},
        )

        T += 1
        r = await client.get("/api/admin/users/pending", cookies=admin_c)
        ok = r.status_code == 200 and len(r.json()) >= 1
        P += ok
        puid = r.json()[0]["profile_id"] if r.json() else ""
        print("2B.1 GET /api/admin/users/pending: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.get("/api/admin/users", cookies=admin_c)
        ok = r.status_code == 200 and len(r.json()) >= 2
        P += ok
        print("2B.2 GET /api/admin/users: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.put(
            "/api/admin/users/" + puid + "/approve", cookies=admin_c
        )
        ok = r.status_code == 200 and r.json()["status"] == "approved"
        P += ok
        print("2B.3 PUT /approve: " + ("PASS" if ok else "FAIL"))

        r3 = await client.post(
            "/api/auth/profile",
            json={"name": "拒否", "department": "総務", "join_date": "2026-01"},
        )
        rid = r3.json()["profile_id"]
        T += 1
        r = await client.put(
            "/api/admin/users/" + rid + "/reject", cookies=admin_c
        )
        ok = r.status_code == 200 and r.json()["status"] == "rejected"
        P += ok
        print("2B.4 PUT /reject: " + ("PASS" if ok else "FAIL"))

        # === SLICE 3-A: Logs ===
        print("=== Slice 3-A: Logs ===")

        T += 1
        r = await client.get("/api/admin/logs", cookies=admin_c)
        ok = r.status_code == 200
        P += ok
        print("3A.1 GET /api/admin/logs: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.get("/api/admin/logs/" + cid, cookies=admin_c)
        ok = r.status_code == 200 and len(r.json()) >= 2
        P += ok
        print("3A.2 GET /api/admin/logs/:id: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.get("/api/admin/logs/analytics", cookies=admin_c)
        ok = r.status_code == 200
        P += ok
        print("3A.3 GET /api/admin/logs/analytics: " + ("PASS" if ok else "FAIL"))

        # === SLICE 3-B: Prompt ===
        print("=== Slice 3-B: Prompt ===")

        T += 1
        r = await client.get("/api/admin/prompt", cookies=admin_c)
        ok = r.status_code == 200 and "system_prompt" in r.json()
        P += ok
        print("3B.1 GET /api/admin/prompt: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.put(
            "/api/admin/prompt",
            cookies=admin_c,
            json={"system_prompt": "Updated", "few_shot_examples": []},
        )
        ok = r.status_code == 200 and r.json()["version"] >= 2
        P += ok
        print("3B.2 PUT /api/admin/prompt: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.get("/api/admin/prompt/history", cookies=admin_c)
        ok = r.status_code == 200 and len(r.json()) >= 2
        P += ok
        print("3B.3 GET /api/admin/prompt/history: " + ("PASS" if ok else "FAIL"))

        # === SLICE 3-C: Knowledge ===
        print("=== Slice 3-C: Knowledge ===")

        T += 1
        r = await client.get("/api/admin/knowledge-sources", cookies=admin_c)
        ok = r.status_code == 200 and len(r.json()) == 2
        P += ok
        sid = r.json()[0]["source_id"] if r.json() else ""
        print("3C.1 GET /api/admin/knowledge-sources: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.put(
            "/api/admin/knowledge-sources/" + sid,
            cookies=admin_c,
            json={"sync_interval_minutes": 30},
        )
        ok = r.status_code == 200 and r.json()["sync_interval_minutes"] == 30
        P += ok
        print("3C.2 PUT /api/admin/knowledge-sources/:id: " + ("PASS" if ok else "FAIL"))

        T += 1
        r = await client.post(
            "/api/admin/sync", cookies=admin_c, json={"source_id": sid}
        )
        ok = r.status_code == 200 and r.json()["last_synced_at"] is not None
        P += ok
        print("3C.3 POST /api/admin/sync: " + ("PASS" if ok else "FAIL"))

        sep = "=" * 50
        pct = int(P / T * 100) if T > 0 else 0
        print("\n" + sep)
        print("TOTAL: %d/%d PASSED (%d%%)" % (P, T, pct))
        if P == T:
            print("ALL 21 ENDPOINTS VERIFIED SUCCESSFULLY!")
        else:
            print("FAILED: %d test(s)" % (T - P))


if __name__ == "__main__":
    asyncio.run(test())

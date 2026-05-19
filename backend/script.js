const loginData = { email: "trainer2@test.bg", password: "trainer2" };
const baseUrl = "http://localhost:3000/api";

async function run() {
  try {
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData)
    });
    
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    const cookie = loginRes.headers.get("set-cookie");

    const groupsRes = await fetch(`${baseUrl}/coach-workspace/my-groups`, {
      headers: { "Cookie": cookie }
    });
    const groups = await groupsRes.json();
    if (!groups.length) throw new Error("No groups found");
    const groupId = groups[0].id;

    const defsRes = await fetch(`${baseUrl}/sports/definitions?isActive=true`, {
      headers: { "Cookie": cookie }
    });
    const defs = await defsRes.json();
    const lj = defs.find(d => d.code === "long_jump") || defs[0];
    console.log(`Chosen Definition: ${lj.code} (${lj.id})`);

    const chalRes = await fetch(`${baseUrl}/sports/groups/${groupId}/challenges?limit=200&offset=0`, {
      headers: { "Cookie": cookie }
    });
    const chalData = await chalRes.json();
    const items = Array.isArray(chalData) ? chalData : (chalData.items || []);

    const filtered = items.filter(c => 
      c.startsOn && (c.startsOn.includes("2026-05-04") || c.startsOn.includes("2026-05-11"))
    );

    filtered.forEach(c => {
      console.log(`ID: ${c.id}, Code: ${c.definition?.code}, Starts: ${c.startsOn}, Status: ${c.status}, Title: ${c.title}`);
    });
  } catch (err) {
    console.log("Error:", err.message);
  }
}
run();

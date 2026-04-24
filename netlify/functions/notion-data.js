exports.handler = async function (event, context) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DB_ID = process.env.NOTION_DB_ID; // Journal Alimentaire

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (!NOTION_TOKEN || !DB_ID) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Variables d'environnement manquantes." }),
    };
  }

  // Date du jour au format YYYY-MM-DD (Paris UTC+2)
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const today = now.toISOString().split("T")[0];

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          property: "Date",
          date: { equals: today },
        },
        sorts: [{ property: "Date", direction: "ascending" }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: res.status, headers, body: JSON.stringify({ error: err }) };
    }

    const data = await res.json();

    // Calcul des totaux + liste des repas
    let totals = { kcal: 0, prot: 0, gluc: 0, lip: 0, fib: 0 };
    const meals = [];

    for (const page of data.results) {
      const p = page.properties;
      const meal = {
        id: page.id,
        name: p["Repas"]?.title?.[0]?.plain_text || "Repas",
        type: p["Type"]?.select?.name || "",
        kcal: p["Calories kcal"]?.number || 0,
        prot: p["Proteines g"]?.number || 0,
        gluc: p["Glucides g"]?.number || 0,
        lip: p["Lipides g"]?.number || 0,
        fib: p["Fibres g"]?.number || 0,
      };
      totals.kcal += meal.kcal;
      totals.prot += meal.prot;
      totals.gluc += meal.gluc;
      totals.lip += meal.lip;
      totals.fib += meal.fib;
      meals.push(meal);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ today, totals, meals }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    };
  }
};

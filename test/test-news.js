// Using native Node global fetch

async function runTest() {
  console.log("Sending request 1 to /api/news (this should trigger a DB query or generation)...");
  const start1 = Date.now();
  try {
    const res = await fetch("http://localhost:3001/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nativeLanguage: "en", level: "intermediate" })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    
    const data = await res.json();
    const duration1 = Date.now() - start1;
    console.log(`Request 1 completed in ${duration1}ms.`);
    console.log(`Received ${data.length} articles.`);
    if (data.length > 0) {
      console.log("First article title:", data[0].title);
    }
    
    console.log("\nSending request 2 to /api/news (this should hit the database cache instantly)...");
    const start2 = Date.now();
    const res2 = await fetch("http://localhost:3001/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nativeLanguage: "en", level: "intermediate" })
    });
    
    if (!res2.ok) {
      throw new Error(`HTTP Error: ${res2.status}`);
    }
    
    const data2 = await res2.json();
    const duration2 = Date.now() - start2;
    console.log(`Request 2 completed in ${duration2}ms.`);
    console.log(`Received ${data2.length} articles.`);
    if (data2.length > 0) {
      console.log("First article title:", data2[0].title);
    }
    
    if (duration2 < 500) {
      console.log("\nSUCCESS: Caching layer resolved the news request in under 500ms!");
    } else {
      console.log(`\nWARNING: Request 2 took ${duration2}ms. Check if caching is working correctly.`);
    }
    
  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

runTest();

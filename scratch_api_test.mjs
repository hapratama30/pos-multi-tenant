async function testApi() {
  console.log("Testing Outlet 5...");
  let res = await fetch('http://localhost:5000/api/ppob/balance?tenant_id=T1A86BC39B52F&outlet_id=5');
  let data = await res.json();
  console.log("Outlet 5:", data);

  console.log("Testing Outlet 6...");
  res = await fetch('http://localhost:5000/api/ppob/balance?tenant_id=T1A86BC39B52F&outlet_id=6');
  data = await res.json();
  console.log("Outlet 6:", data);

  console.log("Testing Empty Outlet...");
  res = await fetch('http://localhost:5000/api/ppob/balance?tenant_id=T1A86BC39B52F&outlet_id=');
  data = await res.json();
  console.log("Empty Outlet:", data);
}

testApi();

fetch('http://localhost:5000/api/incidents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    serviceName: 'inventory',
    rawLog: 'FATAL ERROR: Connection pool timeout. Could not connect to database.'
  })
})
.then(res => res.json())
.then(data => {
  console.log('--- POST Response (Immediate 201 Created) ---');
  console.log(data);
  
  console.log('\nWaiting 2 seconds for AI Background Job to complete...\n');
  
  setTimeout(() => {
    fetch('http://localhost:5000/api/incidents')
      .then(r => r.json())
      .then(d => {
        console.log('--- GET Response (After AI Processing) ---');
        console.log(JSON.stringify(d, null, 2));
      });
  }, 2000);
});

async function main() {
  console.log('🚀 Querying PhonePe Greenhouse API...');
  const api = 'https://boards-api.greenhouse.io/v1/boards/phonepe/jobs';
  
  try {
    const res = await fetch(api);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    const jobs = data.jobs || [];
    console.log(`Total jobs returned from Greenhouse: ${jobs.length}`);
    
    // Search for frontend/UI/developer jobs
    const matchedJobs = jobs.filter(job => {
      const title = job.title || '';
      return title.toLowerCase().includes('frontend') || 
             title.toLowerCase().includes('ui ') || 
             title.toLowerCase().includes('ui-') ||
             title.toLowerCase().includes('web') ||
             title.toLowerCase().includes('react') ||
             title.toLowerCase().includes('design') ||
             title.toLowerCase().includes('creative');
    });
    
    console.log('🔍 Matches:', JSON.stringify(matchedJobs, null, 2));
    
  } catch (err) {
    console.error('❌ Error querying Greenhouse API:', err.message);
  }
}

main();

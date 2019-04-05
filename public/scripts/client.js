const ctx = document.getElementById('sample-chart').getContext('2d');
let sampleChart;

axios.get('/api/entries/sample').then( response => {
    const entries = response.data.entries;
    const data1 = [];
    let i = 1;
    for(const entry of entries) {
        data1.push({ t: entry.published_at, y:entry.temp});
        i += 1;
    }
    console.log(data1);
    sampleChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Temperature',
                data: data1,
                backgroundColor: 'lightblue'
            }]
        },
    })
}).catch(error => {
    console.log(error);
    alert('Unable to get data for the chart.');
})
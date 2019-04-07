import React from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';

const graphStyle = {
    maxWidth: '780px',
    margin: '0 auto'
};

class Graph extends React.Component {
    constructor() {
        super();
        this.state = {
            data: {
                datasets: [],
                
            },
            options: {
                scales: {
                    xAxes: [{
                        type: 'time',
                        time: {
                            unit: 'minute',
                            stepSize: 180,
                            displayFormats: {
                                minute: 'hh:mm a'
                            }
                        },
                    }]
                }
            }
        };
    }

    componentDidMount() {
        axios.get('sample.json').then(response => {
            const entries = response.data.entries;
            const data1 = [];
            for (const entry of entries) {
                data1.push({ t: new Date(entry.published_at), y: entry.voc });
            }
            console.log(data1);
            this.setState({
                ...this.state,
                data: {
                    datasets: [{
                        label: 'VOC Levels',
                        data: data1,
                        borderColor: 'lightblue',
                        backgroundColor: 'lightblue',
                        fill: false,
                    }]
                }
            });
        });
    }

    render() {
        return (
            <div style={graphStyle}>
                <Line data={this.state.data} options={this.state.options} />
            </div>
            
        )
    }
}

export default Graph;
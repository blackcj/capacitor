import React from 'react';
import ReactDOM from 'react-dom';
import Header from './components/Header.jsx';
import Graph from './components/Graph.jsx';

function CapacitorApp() {
  return (
    <div>
      <Header />
      <br />
      <br />
      <Graph />
    </div>
  );
}

ReactDOM.render(<CapacitorApp />, document.getElementById("root"));

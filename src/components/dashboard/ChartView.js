import React from 'react';
import ChartContainer from '../charts/components/ChartContainer';
import './ChartView.css';

const ChartView = ({ tableData, selectedPeriods, onExportRefsReady }) => {
  return (
    <div className="chart-view-container">
      <ChartContainer 
        tableData={tableData}
        selectedPeriods={selectedPeriods}
        onExportRefsReady={onExportRefsReady}
      />
    </div>
  );
};

export default ChartView;

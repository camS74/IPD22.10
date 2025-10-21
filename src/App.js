import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ExcelDataProvider } from './contexts/ExcelDataContext';
import { SalesDataProvider } from './contexts/SalesDataContext';
import { SalesRepReportsProvider } from './contexts/SalesRepReportsContext';
import { FilterProvider } from './contexts/FilterContext';
import Dashboard from './components/dashboard/Dashboard';

import './App.css';

function App() {
  return (
    <div className="App">
      <ExcelDataProvider>
        <SalesDataProvider>
          <SalesRepReportsProvider>
            <FilterProvider>
              <Router>
                <Routes>
                  <Route path="/*" element={<Dashboard />} />
                </Routes>
              </Router>
            </FilterProvider>
          </SalesRepReportsProvider>
        </SalesDataProvider>
      </ExcelDataProvider>
    </div>
  );
}

export default App;

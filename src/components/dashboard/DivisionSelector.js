import React from 'react';
import { useExcelData } from '../../contexts/ExcelDataContext';
import './DivisionSelector.css';

const DivisionSelector = () => {
  const { divisions, selectedDivision, setSelectedDivision } = useExcelData();

  const handleDivisionChange = (division) => {
    setSelectedDivision(division);
  };

  return (
    <div className="division-selector">
      <div className="division-selector-label">Select Division</div>
      <div className="division-checkboxes">
        {divisions.map(division => (
          <label key={division} className="division-checkbox-item">
            <input
              type="radio"
              name="division"
              value={division}
              checked={selectedDivision === division}
              onChange={() => handleDivisionChange(division)}
              className="division-checkbox"
            />
            <span className="division-checkbox-label">{division}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default DivisionSelector;

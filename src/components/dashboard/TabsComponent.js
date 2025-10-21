import React, { useState, useRef, useEffect } from 'react';
import './TabsComponent.css';

const TabsComponent = ({ children, variant = 'primary', defaultActiveTab = 0, onTabChange }) => {
  const [activeTab, setActiveTab] = useState(defaultActiveTab);
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabRefs = useRef([]);
  
  const handleTabClick = (index) => {
    setActiveTab(index);
    
    // Call onTabChange callback if provided
    if (onTabChange) {
      const tabKey = React.Children.toArray(children)[index]?.key;
      onTabChange(tabKey);
    }
  };

  // Update indicator position when active tab changes
  useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];
    if (activeTabElement) {
      setIndicatorStyle({
        left: activeTabElement.offsetLeft,
        width: activeTabElement.offsetWidth,
      });
    }
  }, [activeTab]);
  
  return (
    <div className={`tabs-container ${variant}`}>
      <div className="tabs-header">
        <div className="tabs-nav">
          {React.Children.map(children, (child, index) => (
            <button 
              key={index}
              ref={el => tabRefs.current[index] = el}
              className={`tab-button ${activeTab === index ? 'active' : ''}`}
              onClick={() => handleTabClick(index)}
            >
              {child.props.label}
            </button>
          ))}
          <div 
            className="tab-indicator" 
            style={indicatorStyle}
          />
        </div>
      </div>
      <div className="tabs-content">
        {React.Children.map(children, (child, index) => (
          <div 
            key={index}
            className={`tab-panel ${activeTab === index ? 'active' : ''}`}
          >
            {activeTab === index && child}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Tab = ({ children }) => {
  return children;
};

export default TabsComponent;

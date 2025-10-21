import React, { useState, useEffect } from 'react';
import { useExcelData } from '../../contexts/ExcelDataContext';
import CountryReference from './CountryReference';
import MaterialPercentageManager from './MaterialPercentageManager';
import './MasterData.css';

const MasterData = () => {
  const { selectedDivision } = useExcelData();
  const [activeTab, setActiveTab] = useState('materials');
  const [saveMessage, setSaveMessage] = useState('');
  const [testMessage, setTestMessage] = useState('');

  // Sales Rep Management State
  const [availableReps, setAvailableReps] = useState([]);
  const [selectedReps, setSelectedReps] = useState([]);
  const [salesRepGroups, setSalesRepGroups] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    members: [],
    isEditing: false,
    originalName: ''
  });

  // Material Percentages State (existing - kept for compatibility)
  const [masterData, setMasterData] = useState({
    'FP': {
      'Laminates': { PE: 45, BOPP: 25, PET: 20, Alu: 5, Paper: 5, 'PVC/PET': 0 },
      'Films': { PE: 60, BOPP: 30, PET: 10, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Bags': { PE: 70, BOPP: 20, PET: 0, Alu: 0, Paper: 10, 'PVC/PET': 0 },
      'Pouches': { PE: 40, BOPP: 30, PET: 15, Alu: 10, Paper: 5, 'PVC/PET': 0 }
    },
    'SB': {
      'Stretch Films': { PE: 90, BOPP: 5, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 5 },
      'Shrink Films': { PE: 85, BOPP: 10, PET: 5, Alu: 0, Paper: 0, 'PVC/PET': 0 },
      'Agricultural Films': { PE: 95, BOPP: 0, PET: 0, Alu: 0, Paper: 0, 'PVC/PET': 5 }
    },
    'TF': {
      'Technical Films': { PE: 30, BOPP: 20, PET: 40, Alu: 5, Paper: 0, 'PVC/PET': 5 },
      'Barrier Films': { PE: 35, BOPP: 15, PET: 25, Alu: 20, Paper: 0, 'PVC/PET': 5 },
      'Specialty Films': { PE: 25, BOPP: 25, PET: 30, Alu: 15, Paper: 0, 'PVC/PET': 5 }
    },
    'HCM': {
      'Hygiene Films': { PE: 80, BOPP: 10, PET: 5, Alu: 0, Paper: 5, 'PVC/PET': 0 },
      'Medical Films': { PE: 40, BOPP: 20, PET: 30, Alu: 5, Paper: 0, 'PVC/PET': 5 },
      'Pharmaceutical': { PE: 35, BOPP: 25, PET: 25, Alu: 10, Paper: 0, 'PVC/PET': 5 }
    }
  });

  const [saving, setSaving] = useState(false);

  const materialColumns = ['PE', 'BOPP', 'PET', 'Alu', 'Paper', 'PVC/PET'];

  const divisionInfo = {
    'FP': { name: 'Flexible Packaging', color: '#007bff' },
    'SB': { name: 'Stretch & Bags', color: '#28a745' },
    'TF': { name: 'Technical Films', color: '#ffc107' },
    'HCM': { name: 'Hygiene & Medical', color: '#dc3545' }
  };

  // Load sales rep data when division changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedDivision && activeTab === 'test2') {
      loadSalesRepData();
    }
  }, [selectedDivision, activeTab]);

  const loadSalesRepData = async () => {
    if (!selectedDivision) return;
    
    setLoading(true);
    try {
      // Load available sales reps for the division using dedicated endpoint
      const response = await fetch(`http://localhost:3001/api/sales-reps-universal?division=${selectedDivision}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Ensure proper case formatting for all names
          const salesReps = data.data
            .filter(Boolean)
            .map(name => {
              if (!name) return name;
              return name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
            });
          console.log(`✅ Loaded ${salesReps.length} sales reps for ${selectedDivision}:`, salesReps);
          setAvailableReps(salesReps);
        } else {
          console.warn(`⚠️ No sales rep data found for ${selectedDivision}`);
          setAvailableReps([]);
        }
      } else {
        console.error(`❌ Failed to load sales reps for ${selectedDivision}:`, response.status);
        setAvailableReps([]);
      }

      // Load existing sales rep groups using universal endpoint
      const groupsResponse = await fetch(`http://localhost:3001/api/sales-rep-groups-universal?division=${selectedDivision}`);
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        setSalesRepGroups(groupsData.success ? groupsData.data : {});
        console.log(`✅ Loaded sales rep groups for ${selectedDivision}:`, groupsData.data);
      } else {
        console.error(`❌ Failed to load sales rep groups for ${selectedDivision}:`, groupsResponse.status);
        setSalesRepGroups({});
      }
    } catch (error) {
      console.error('Error loading sales rep data:', error);
      setTestMessage(`Error loading sales rep data: ${error.message}`);
      setAvailableReps([]);
      setSalesRepGroups({});
    } finally {
      setLoading(false);
    }
  };

  const handlePercentageChange = (division, productGroup, material, value) => {
    const numValue = parseFloat(value) || 0;
    setMasterData(prev => ({
      ...prev,
      [division]: {
        ...prev[division],
        [productGroup]: {
          ...prev[division][productGroup],
          [material]: numValue
        }
      }
    }));
  };

  const calculateRowTotal = (division, productGroup) => {
    if (!masterData[division] || !masterData[division][productGroup]) return 0;
    
    return materialColumns.reduce((total, material) => {
      return total + (masterData[division][productGroup][material] || 0);
    }, 0);
  };

  const resetRow = (division, productGroup) => {
    setMasterData(prev => ({
      ...prev,
      [division]: {
        ...prev[division],
        [productGroup]: materialColumns.reduce((acc, material) => ({
          ...acc,
          [material]: 0
        }), {})
      }
    }));
  };

  const saveMasterData = async () => {
    try {
      setSaving(true);
      setSaveMessage('');
      
      const response = await fetch('/api/master-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: masterData }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSaveMessage('✅ Master data saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        throw new Error('Failed to save master data');
      }
    } catch (err) {
      console.error('Error saving master data:', err);
      setSaveMessage('❌ Error saving master data: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Sales Rep Group Management Functions
  const createSalesRepGroup = async () => {
    if (!groupFormData.name.trim() || groupFormData.members.length === 0) {
      setTestMessage('Please provide a group name and select at least one sales rep.');
      return;
    }

    try {
      setLoading(true);
      // Use universal endpoint for all divisions
      const response = await fetch('http://localhost:3001/api/sales-rep-groups-universal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          division: selectedDivision,
          groupName: groupFormData.name.trim(),
          members: groupFormData.members
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setTestMessage(`✅ Sales rep group "${groupFormData.name}" created successfully for ${selectedDivision} division!`);
        setGroupFormData({ name: '', members: [], isEditing: false, originalName: '' });
        setSelectedReps([]);
        await loadSalesRepData(); // Reload data
        setTimeout(() => setTestMessage(''), 3000);
      } else {
        throw new Error(result.message || 'Failed to create sales rep group');
      }
    } catch (error) {
      console.error('Error creating sales rep group:', error);
      setTestMessage(`❌ Error creating sales rep group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteSalesRepGroup = async (groupName) => {
    if (!window.confirm(`Are you sure you want to delete the sales rep group "${groupName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      // Use universal endpoint for all divisions
      const response = await fetch(`http://localhost:3001/api/sales-rep-groups-universal?division=${selectedDivision}&groupName=${encodeURIComponent(groupName)}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        setTestMessage(`✅ Sales rep group "${groupName}" deleted successfully from ${selectedDivision} division!`);
        await loadSalesRepData(); // Reload data
        setTimeout(() => setTestMessage(''), 3000);
      } else {
        throw new Error(result.message || 'Failed to delete sales rep group');
      }
    } catch (error) {
      console.error('Error deleting sales rep group:', error);
      setTestMessage(`❌ Error deleting sales rep group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editSalesRepGroup = (groupName, members) => {
    setGroupFormData({
      name: groupName,
      members: members,
      isEditing: true,
      originalName: groupName
    });
  };

  const updateSalesRepGroup = async () => {
    if (!groupFormData.name.trim() || groupFormData.members.length === 0) {
      setTestMessage('Please provide a group name and select at least one sales rep.');
      return;
    }

    try {
      setLoading(true);
      // Use universal endpoint for all divisions
      const response = await fetch('http://localhost:3001/api/sales-rep-groups-universal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          division: selectedDivision,
          groupName: groupFormData.name.trim(),
          members: groupFormData.members,
          originalGroupName: groupFormData.originalName
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setTestMessage(`✅ Sales rep group updated successfully for ${selectedDivision} division!`);
        setGroupFormData({ name: '', members: [], isEditing: false, originalName: '' });
        setSelectedReps([]);
        await loadSalesRepData(); // Reload data
        setTimeout(() => setTestMessage(''), 3000);
      } else {
        throw new Error(result.message || 'Failed to update sales rep group');
      }
    } catch (error) {
      console.error('Error updating sales rep group:', error);
      setTestMessage(`❌ Error updating sales rep group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setGroupFormData({ name: '', members: [], isEditing: false, originalName: '' });
    setSelectedReps([]);
  };

  const toggleSalesRepSelection = (repName) => {
    setSelectedReps(prev => {
      if (prev.includes(repName)) {
        return prev.filter(name => name !== repName);
      } else {
        return [...prev, repName];
      }
    });
  };

  const addSelectedRepsToGroup = () => {
    setGroupFormData(prev => ({
      ...prev,
      members: [...new Set([...prev.members, ...selectedReps])]
    }));
    setSelectedReps([]);
  };

  const removeRepFromGroup = (repName) => {
    setGroupFormData(prev => ({
      ...prev,
      members: prev.members.filter(name => name !== repName)
    }));
  };

  const filteredReps = availableReps.filter(rep => 
    rep.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ 
        color: '#2c3e50', 
        marginBottom: '30px',
        fontSize: '2.5rem',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        📊 Master Data Management
      </h1>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <button 
          style={{
            padding: '15px 25px',
            backgroundColor: activeTab === 'materials' ? '#007bff' : 'white',
            color: activeTab === 'materials' ? 'white' : '#007bff',
            border: '2px solid #007bff',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('materials')}
        >
          📊 Material Percentages
        </button>
        <button 
          style={{
            padding: '15px 25px',
            backgroundColor: activeTab === 'test2' ? '#007bff' : 'white',
            color: activeTab === 'test2' ? 'white' : '#007bff',
            border: '2px solid #007bff',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('test2')}
        >
          🧑‍💼 Sales Rep Groups
        </button>
        <button 
          style={{
            padding: '15px 25px',
            backgroundColor: activeTab === 'test3' ? '#007bff' : 'white',
            color: activeTab === 'test3' ? 'white' : '#007bff',
            border: '2px solid #007bff',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('test3')}
        >
          🌍 Country Reference
        </button>
      </div>

      {/* Tab 1: Material Percentages */}
      {activeTab === 'materials' && (
        <MaterialPercentageManager />
      )}

      {/* Tab 2: Sales Rep Selection */}
      {activeTab === 'test2' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3>🧑‍💼 Sales Rep Selection for {selectedDivision || 'No Division Selected'}</h3>
          
          {!selectedDivision && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              padding: '15px',
              borderRadius: '4px',
              color: '#856404',
              marginBottom: '20px'
            }}>
              <strong>⚠️ Please select a division first</strong>
            </div>
          )}

          {selectedDivision && (
            <>
              {testMessage && (
                <div style={{
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  backgroundColor: testMessage.includes('successfully') ? '#d4edda' : '#f8d7da',
                  color: testMessage.includes('successfully') ? '#155724' : '#721c24',
                  border: `1px solid ${testMessage.includes('successfully') ? '#c3e6cb' : '#f5c6cb'}`
                }}>
                  {testMessage}
                </div>
              )}

              {/* Available Sales Reps - Modern Card-Based Interface */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '15px 20px',
                  borderRadius: '12px',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '24px', marginRight: '10px' }}>👥</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Available Sales Reps</h4>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: '0.9' }}>
                      {availableReps.length} sales representatives available
                    </p>
                  </div>
                </div>

                {/* Search Bar with Modern Design */}
                <div style={{ 
                  position: 'relative',
                  marginBottom: '20px'
                }}>
                  <input
                    type="text"
                    placeholder="🔍 Search sales reps..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 45px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '25px',
                      fontSize: '16px',
                      background: '#f8f9fa',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.background = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e1e5e9';
                      e.target.style.background = '#f8f9fa';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6c757d',
                    fontSize: '18px'
                  }}>
                    🔍
                  </div>
                </div>

                {/* Sales Rep Cards Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '10px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '5px',
                  border: '2px solid #f1f3f4',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                }}>
                  {filteredReps.length === 0 ? (
                    <div style={{ 
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: '#6c757d'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                        {availableReps.length === 0 ? 'No sales reps available' : 'No sales reps match your search'}
                      </p>
                      {availableReps.length > 0 && (
                        <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: '0.7' }}>
                          Try adjusting your search terms
                        </p>
                      )}
                    </div>
                  ) : (
                    filteredReps.map((rep, index) => {
                      const isSelected = selectedReps.includes(rep);
                      return (
                        <div
                          key={rep}
                          onClick={() => toggleSalesRepSelection(rep)}
                          style={{
                            background: isSelected 
                              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              : 'white',
                            border: `2px solid ${isSelected ? '#667eea' : '#e1e5e9'}`,
                            borderRadius: '10px',
                            padding: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
                            boxShadow: isSelected 
                              ? '0 6px 20px rgba(102, 126, 234, 0.3)'
                              : '0 2px 8px rgba(0, 0, 0, 0.1)',
                            animationDelay: `${index * 50}ms`,
                            minHeight: '48px'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                              e.target.style.borderColor = '#667eea';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                              e.target.style.borderColor = '#e1e5e9';
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: isSelected 
                                  ? 'rgba(255, 255, 255, 0.2)'
                                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '8px',
                                fontSize: '14px',
                                color: isSelected ? 'white' : 'white',
                                flexShrink: 0
                              }}>
                                👤
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontWeight: '600',
                                  fontSize: '14px',
                                  color: isSelected ? 'white' : '#2c3e50',
                                  lineHeight: '1.2',
                                  wordWrap: 'break-word',
                                  hyphens: 'auto'
                                }}>
                                  {rep}
                                </div>
                              </div>
                            </div>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: `2px solid ${isSelected ? 'white' : '#667eea'}`,
                              background: isSelected ? 'white' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              color: isSelected ? '#667eea' : 'transparent',
                              flexShrink: 0,
                              marginLeft: '8px'
                            }}>
                              {isSelected ? '✓' : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add to Group Button */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  marginTop: '20px'
                }}>
                  <button
                    onClick={addSelectedRepsToGroup}
                    disabled={selectedReps.length === 0}
                    style={{
                      padding: '12px 30px',
                      background: selectedReps.length > 0 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '25px',
                      cursor: selectedReps.length > 0 ? 'pointer' : 'not-allowed',
                      fontSize: '16px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      boxShadow: selectedReps.length > 0 
                        ? '0 4px 15px rgba(102, 126, 234, 0.3)'
                        : 'none',
                      transform: selectedReps.length > 0 ? 'translateY(0)' : 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedReps.length > 0) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedReps.length > 0) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                      }
                    }}
                  >
                    ➕ Add to Group ({selectedReps.length} selected)
                  </button>
                </div>
              </div>

              {/* Group Form */}
              <div style={{ marginBottom: '30px' }}>
                <h4>{groupFormData.isEditing ? 'Edit Group' : 'Create New Group'}</h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
                  <input
                    type="text"
                    placeholder="Group name"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData(prev => ({ ...prev, name: e.target.value }))}
                    style={{
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      flex: 1
                    }}
                  />
                  <button
                    onClick={groupFormData.isEditing ? updateSalesRepGroup : createSalesRepGroup}
                    disabled={loading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: loading ? '#6c757d' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Saving...' : (groupFormData.isEditing ? 'Update' : 'Create')}
                  </button>
                  {groupFormData.isEditing && (
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
                
                {/* Selected Members */}
                {groupFormData.members.length > 0 && (
                  <div>
                    <h5>Group Members ({groupFormData.members.length}):</h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {groupFormData.members.map(member => (
                        <span
                          key={member}
                          style={{
                            backgroundColor: '#e9ecef',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          {member}
                          <button
                            onClick={() => removeRepFromGroup(member)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc3545',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Existing Groups - Modern Design */}
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '20px',
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  padding: '15px 20px',
                  borderRadius: '12px',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '24px', marginRight: '10px' }}>👥</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Existing Groups</h4>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: '0.9' }}>
                      {Object.keys(salesRepGroups).length} groups configured
                    </p>
                  </div>
                </div>
                
                {Object.keys(salesRepGroups).length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    borderRadius: '12px',
                    border: '2px dashed #dee2e6'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>📁</div>
                    <p style={{ color: '#6c757d', fontSize: '16px', fontWeight: '500', margin: 0 }}>
                      No groups created yet
                    </p>
                    <p style={{ color: '#6c757d', fontSize: '14px', margin: '5px 0 0 0', opacity: '0.7' }}>
                      Create your first sales rep group above
                    </p>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '20px' 
                  }}>
                    {Object.entries(salesRepGroups).map(([groupName, members], index) => (
                      <div
                        key={groupName}
                        style={{
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                          border: '2px solid #e9ecef',
                          borderRadius: '16px',
                          padding: '20px',
                          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-5px)';
                          e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                          e.target.style.borderColor = '#28a745';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                          e.target.style.borderColor = '#e9ecef';
                        }}
                      >
                        {/* Group Header */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginBottom: '15px',
                          paddingBottom: '10px',
                          borderBottom: '2px solid #f1f3f4'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{
                              width: '45px',
                              height: '45px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '12px',
                              fontSize: '20px',
                              color: 'white'
                            }}>
                              👥
                            </div>
                            <div>
                              <h5 style={{ 
                                margin: 0, 
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#2c3e50'
                              }}>
                                {groupName}
                              </h5>
                              <p style={{ 
                                margin: '2px 0 0 0',
                                fontSize: '12px',
                                color: '#6c757d'
                              }}>
                                {members.length} member{members.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => editSalesRepGroup(groupName, members)}
                              style={{
                                padding: '8px 12px',
                                background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-1px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.3)';
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deleteSalesRepGroup(groupName)}
                              style={{
                                padding: '8px 12px',
                                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-1px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)';
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                        
                        {/* Group Members */}
                        <div>
                          <div style={{ 
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#495057',
                            marginBottom: '8px'
                          }}>
                            Members:
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: '6px' 
                          }}>
                            {members.map((member, memberIndex) => (
                              <span
                                key={member}
                                style={{
                                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                  color: '#1976d2',
                                  padding: '4px 10px',
                                  borderRadius: '15px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  border: '1px solid #90caf9'
                                }}
                              >
                                👤 {member}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Country Reference */}
      {activeTab === 'test3' && (
        <CountryReference />
      )}
    </div>
  );
};

export default MasterData;
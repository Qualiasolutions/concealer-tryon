import React, { useState } from 'react';

const ShadeMixer = ({ shades, onSaveCustomShade, onClose }) => {
  const [selectedShades, setSelectedShades] = useState([]);
  const [customShadeName, setCustomShadeName] = useState('');
  const [sliders, setSliders] = useState({});

  const handleShadeSelect = (shadeId) => {
    if (selectedShades.includes(shadeId)) {
      setSelectedShades(selectedShades.filter(id => id !== shadeId));
      const newSliders = { ...sliders };
      delete newSliders[shadeId];
      setSliders(newSliders);
    } else if (selectedShades.length < 4) {
      setSelectedShades([...selectedShades, shadeId]);
      setSliders({ ...sliders, [shadeId]: 25 });
    }
  };

  const updateSlider = (shadeId, value) => {
    const newSliders = { ...sliders, [shadeId]: value };
    // Normalize all values to total 100%
    const total = Object.values(newSliders).reduce((a, b) => a + b, 0);
    if (total > 0) {
      Object.keys(newSliders).forEach(key => {
        newSliders[key] = (newSliders[key] / total) * 100;
      });
    }
    setSliders(newSliders);
  };

  const calculateBlendedColor = () => {
    let r = 0, g = 0, b = 0;
    selectedShades.forEach(shadeId => {
      const hex = shades[shadeId].color;
      const percentage = sliders[shadeId] / 100;
      r += parseInt(hex.slice(1, 3), 16) * percentage;
      g += parseInt(hex.slice(3, 5), 16) * percentage;
      b += parseInt(hex.slice(5, 7), 16) * percentage;
    });
    
    const hexR = Math.round(r).toString(16).padStart(2, '0');
    const hexG = Math.round(g).toString(16).padStart(2, '0');
    const hexB = Math.round(b).toString(16).padStart(2, '0');
    
    return `#${hexR}${hexG}${hexB}`;
  };

  const handleSave = () => {
    if (customShadeName && selectedShades.length > 0) {
      const blendedColor = calculateBlendedColor();
      onSaveCustomShade({
        name: customShadeName,
        color: blendedColor,
        description: "Custom blended shade",
        isCustom: true,
        texture: selectedShades[0].texture // Use first shade's texture
      });
      onClose();
    }
  };

  return (
    <div className="shade-mixer-container">
      <div className="shade-mixer-header">
        <h3>Create Custom Shade</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="shade-mixer-content">
        <div className="shade-selection">
          <p>Select up to 4 shades to blend (minimum 1):</p>
          <div className="available-shades">
            {Object.entries(shades).map(([id, shade]) => (
              !shade.isCustom && (
                <button
                  key={id}
                  onClick={() => handleShadeSelect(id)}
                  className={`shade-option ${selectedShades.includes(id) ? 'selected' : ''}`}
                >
                  <span 
                    className="color-preview" 
                    style={{ backgroundColor: shade.color }}
                  />
                  <span className="shade-name">{shade.name}</span>
                </button>
              )
            ))}
          </div>
        </div>

        {selectedShades.length > 0 && (
          <div className="blend-controls">
            <div className="sliders">
              {selectedShades.map(shadeId => (
                <div key={shadeId} className="slider-container">
                  <label>
                    {shades[shadeId].name} ({Math.round(sliders[shadeId])}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliders[shadeId]}
                    onChange={(e) => updateSlider(shadeId, parseFloat(e.target.value))}
                    className="blend-slider"
                  />
                </div>
              ))}
            </div>

            <div className="preview-section">
              <div 
                className="color-preview-large"
                style={{ backgroundColor: calculateBlendedColor() }}
              />
              <input
                type="text"
                placeholder="Name your shade"
                value={customShadeName}
                onChange={(e) => setCustomShadeName(e.target.value)}
                className="shade-name-input"
              />
              <button 
                className="save-shade-button"
                onClick={handleSave}
                disabled={!customShadeName || selectedShades.length === 0}
              >
                Save Custom Shade
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShadeMixer;
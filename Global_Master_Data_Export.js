/**
 * Global Master Data Export Utility
 * Provides consolidated master data export that can be used from anywhere in the application
 * Instead of 6 separate sheets, uses 3 consolidated sheets based on Ac_Classification
 */

// Global function to add consolidated master data sheets to a workbook
function addConsolidatedMasterDataToWorkbook(wb) {
  if (!wb) {
    console.error('Workbook is required');
    return;
  }

  try {
    // Load unified master data from localStorage
    const unifiedDataStr = localStorage.getItem('unified_master_data');
    const unified = unifiedDataStr ? JSON.parse(unifiedDataStr) : {};

    // STEP 1: Ac_Category consolidated sheet (with Ac_Classification)
    const acCategoryData = [['Ac_Category', 'Ac_Classification']]; // Header
    const addToAcCategory = (values, classification) => {
      if (Array.isArray(values)) {
        values.forEach(v => {
          if (v && v !== '') {
            acCategoryData.push([v, classification]);
          }
        });
      }
    };
    addToAcCategory(unified.income?.Income_Category || [], 'Income');
    addToAcCategory(unified.investment?.Investment_Category || [], 'Investment');
    addToAcCategory(unified.expense?.Expanse_Category || [], 'Expanse');
    addToAcCategory(unified.tenants?.Tenant_Category || [], 'Tenant');
    
    if (acCategoryData.length > 1) { // If we have data beyond header
      const ws = XLSX.utils.aoa_to_sheet(acCategoryData);
      XLSX.utils.book_append_sheet(wb, ws, 'Ac_Category');
      console.log(`Added Ac_Category sheet with ${acCategoryData.length - 1} items`);
    }

    // STEP 2: Ac_Tag consolidated sheet (with Ac_Classification)
    const acTagData = [['Ac_Tag', 'Ac_Classification']]; // Header
    const addToAcTag = (values, classification) => {
      if (Array.isArray(values)) {
        values.forEach(v => {
          if (v && v !== '') {
            acTagData.push([v, classification]);
          }
        });
      }
    };
    addToAcTag(unified.income?.Income_Ac_Tag || [], 'Income');
    addToAcTag(unified.investment?.Investment_Ac_Tag || [], 'Investment');
    addToAcTag(unified.expense?.Expanse_Ac_Tag || [], 'Expanse');
    addToAcTag(unified.tenants?.Tenant_Ac_Tag || [], 'Tenant');
    
    if (acTagData.length > 1) { // If we have data beyond header
      const ws = XLSX.utils.aoa_to_sheet(acTagData);
      XLSX.utils.book_append_sheet(wb, ws, 'Ac_Tag');
      console.log(`Added Ac_Tag sheet with ${acTagData.length - 1} items`);
    }

    // STEP 3: Ac_Classification standalone sheet
    const acClassification = unified.common?.Ac_Classification || [];
    if (Array.isArray(acClassification) && acClassification.length > 0) {
      const ws = XLSX.utils.aoa_to_sheet([['Ac_Classification'], ...acClassification.map(v => [v])]);
      XLSX.utils.book_append_sheet(wb, ws, 'Ac_Classification');
      console.log(`Added Ac_Classification sheet with ${acClassification.length} items`);
    }

    // STEP 4: Add other common/master sheets (Currency, Mode, Status_Txn, Ac_Holder, Frequency, Ac_Status, Country, Institution, Ac_Type)
    const addMasterSheet = (sheetName, values) => {
      if (Array.isArray(values) && values.length > 0) {
        const ws = XLSX.utils.aoa_to_sheet([[sheetName], ...values.map(v => [v])]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        console.log(`Added ${sheetName} sheet with ${values.length} items`);
      }
    };

    if (unified.common) {
      addMasterSheet('Currency', unified.common.Currency);
      addMasterSheet('Mode', unified.common.Mode);
      addMasterSheet('Status_Txn', unified.common.Status_Txn);
      addMasterSheet('Ac_Holder', unified.common.Ac_Holder);
      addMasterSheet('Frequency', unified.common.Frequency);
      addMasterSheet('Ac_Status', unified.common.Ac_Status);
      addMasterSheet('Country', unified.common.Country);
      addMasterSheet('Institution', unified.common.Institution);
      addMasterSheet('Ac_Type', unified.common.Ac_Type);
    }

    // STEP 5: Add module-specific master sheets (Task, etc.)
    if (unified.task) {
      Object.keys(unified.task).forEach(key => {
        if (Array.isArray(unified.task[key]) && unified.task[key].length > 0) {
          addMasterSheet(key, unified.task[key]);
        }
      });
    }

    console.log('Consolidated master data sheets added successfully');
  } catch (e) {
    console.error('Error adding consolidated master data to workbook:', e);
  }
}





import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── EXCEL EXPORT ──────────────────────────────────────────────────────────────
export function exportToExcel(households, pregnant, children, area = {}) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Main Household Survey
  const hhHeaders = [
    ['House to House Survey Form (Form SC-3)'],
    [`District: ${area.district || '-'}`, `Block: ${area.block || '-'}`, `GP: ${area.gp || '-'}`, `Village: ${area.village || '-'}`, `Sub-Center: ${area.subcenter || '-'}`],
    [],
    ['House No.', 'Head of Family', 'Guardian Name', 'Address', 'Landmark', 'Contact', 'Family Members',
     'Pregnant Women', 'Child <1 Month', 'Child 1M–1Yr', 'Child 1–2Yr', 'Child 2–5Yr', 'Child 6–18Yr', 'Missed Vaccine'],
  ];
  const hhRows = households.map(h => [
    h.id, h.headName, h.guardianName, h.address || '', h.landmark || '', h.contact, h.familyMembers,
    h.pregnantWomen, h.childUnder1Month, h.child1MonthTo1Year,
    h.child1To2Years, h.child2To5Years, h.child6To18Years, h.childMissedVaccine
  ]);
  const totalRow = ['', '', '', '', 'TOTAL', '',
    households.reduce((s, h) => s + (h.familyMembers || 0), 0),
    households.reduce((s, h) => s + (h.pregnantWomen || 0), 0),
    households.reduce((s, h) => s + (h.childUnder1Month || 0), 0),
    households.reduce((s, h) => s + (h.child1MonthTo1Year || 0), 0),
    households.reduce((s, h) => s + (h.child1To2Years || 0), 0),
    households.reduce((s, h) => s + (h.child2To5Years || 0), 0),
    households.reduce((s, h) => s + (h.child6To18Years || 0), 0),
    households.reduce((s, h) => s + (h.childMissedVaccine || 0), 0),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet([...hhHeaders, ...hhRows, totalRow]);
  ws1['!cols'] = [8,22,20,25,20,14,10,10,12,12,12,12,12,14].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Main Sheet');

  // Sheet 2: Pregnant Women
  const pwHeaders = [
    ['Head Count Survey of Pregnant Women'],
    [`District: ${area.district || '-'}`, `Block: ${area.block || '-'}`, `GP: ${area.gp || '-'}`, `Village: ${area.village || '-'}`, `Sub-Center: ${area.subcenter || '-'}`],
    [],
    ['HH No.', 'Name', 'DOB', 'Age', 'Husband Name', 'Mobile', 'MCP Card / UWN ID', 'LMP',
     'TD-1', 'TD-2', 'TD-Booster', '1st ANC', '2nd ANC', '3rd ANC', '4th ANC', 'TD Due', 'ANC Due']
  ];
  const calcAge = (dob) => {
    if (!dob) return '';
    const d = new Date(dob), t = new Date();
    return Math.floor((t - d) / (365.25 * 24 * 3600 * 1000));
  };
  const pwRows = pregnant.map(p => [
    p.hhNo, p.name, p.dob, calcAge(p.dob), p.husbandName, p.mobile, p.mcpCardUwn || '', p.lmp,
    p.td1, p.td2, p.tdBooster, p.anc1, p.anc2, p.anc3, p.anc4, p.tdDue, p.ancDue
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([...pwHeaders, ...pwRows]);
  ws2['!cols'] = [8,20,12,6,20,14,20,12,12,12,12,12,12,12,12,12,12].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Pregnant');

  // Sheet 3: 0-2 Year Children
  const chHeaders = [
    ['Head Count Survey – Children 0 to 2 Years'],
    [`District: ${area.district || '-'}`, `Block: ${area.block || '-'}`, `GP: ${area.gp || '-'}`, `Village: ${area.village || '-'}`, `Sub-Center: ${area.subcenter || '-'}`],
    [],
    ['HH No.', 'Name', 'DOB', 'Age(M)', 'Gender', 'Guardian', 'Mobile', 'MCP Card / UWN ID',
     'bOPV(B)', 'BCG', 'HepB(B)', 'bOPV1', 'RVV1', 'f-IPV 1', 'PCV-1', 'Penta-1',
     'bOPV2', 'RVV2', 'Penta-2', 'bOPV3', 'RVV3', 'f-IPV 2', 'PCV-2', 'Penta-3',
     'f-IPV 3', 'MR-1', 'PCV-B', 'JE-1', 'VitA-1',
     'bOPV-B', 'MR-2', 'DPT-B', 'JE-2', 'VitA-2', 'f-IPV-B']
  ];
  const calcAgeMonths = (dob) => {
    if (!dob) return '';
    const d = new Date(dob), t = new Date();
    return (t.getFullYear() - d.getFullYear()) * 12 + t.getMonth() - d.getMonth();
  };
  const chRows = children.map(c => [
    c.hhNo, c.name, c.dob, calcAgeMonths(c.dob), c.gender, c.guardianName, c.mobile, c.mcpCardUwn || '',
    c.bOPV_birth, c.BCG, c.HepB, c.bOPV1, c.RVV1, c.fIPV1, c.PCV1, c.Penta1,
    c.bOPV2, c.RVV2, c.Penta2, c.bOPV3, c.RVV3, c.fIPV2, c.PCV2, c.Penta3,
    c.fIPV3, c.MR1, c.PCVBooster, c.JE1, c.VitA1,
    c.bOPV_booster, c.MR2, c.DPT_booster, c.JE2, c.VitA2, c.fIPV_booster || ''
  ]);
  const ws3 = XLSX.utils.aoa_to_sheet([...chHeaders, ...chRows]);
  XLSX.utils.book_append_sheet(wb, ws3, '0-2 Year Child');

  XLSX.writeFile(wb, 'House_Survey_SC3.xlsx');
}

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────
export function exportToPDF(households, pregnant, children, activeTab, area = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const green = [22, 101, 52];
  const lightGreen = [240, 253, 244];
  const teal = [13, 148, 136];

  const addHeader = (title, subtitle) => {
    doc.setFillColor(...green);
    doc.rect(0, 0, 297, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 297 - 14, 11, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  };

  const addMeta = (y) => {
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const metaStr = `District: ${area.district || '-'} | Block: ${area.block || '-'} | GP: ${area.gp || '-'} | Village: ${area.village || '-'} | Sub-Center: ${area.subcenter || '-'}`;
    doc.text(metaStr, 14, y);
    doc.setTextColor(0, 0, 0);
  };

  if (activeTab === 'households' || activeTab === 'all') {
    addHeader('House to House Survey Form (SC-3)', `Total Houses: ${households.length}`);
    addMeta(24);
    const body = households
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map(h => [
        h.id, h.headName + (h.guardianName ? ` (${h.guardianName})` : ''), 
        h.address || '-', h.landmark || '-', h.contact, h.familyMembers,
        h.pregnantWomen || '-', h.childUnder1Month || '-', h.child1MonthTo1Year || '-',
        h.child1To2Years || '-', h.child2To5Years || '-', h.child6To18Years || '-', h.childMissedVaccine || '-'
      ]);
    autoTable(doc, {
      startY: 28,
      head: [['#', 'Head (Guardian)', 'Address', 'Landmark', 'Contact', 'Fam', 'Preg', '<1M', '1M–1Y', '1–2Y', '2–5Y', '6-18Y', 'Missed']],
      body: body,
      foot: [['', '', '', 'TOTAL', '',
        households.reduce((s,h)=>s+(h.familyMembers||0),0),
        households.reduce((s,h)=>s+(h.pregnantWomen||0),0),
        households.reduce((s,h)=>s+(h.childUnder1Month||0),0),
        households.reduce((s,h)=>s+(h.child1MonthTo1Year||0),0),
        households.reduce((s,h)=>s+(h.child1To2Years||0),0),
        households.reduce((s,h)=>s+(h.child2To5Years||0),0),
        households.reduce((s,h)=>s+(h.child6To18Years||0),0),
        households.reduce((s,h)=>s+(h.childMissedVaccine||0),0),
      ]],
      headStyles: { fillColor: green, fontSize: 7, fontStyle: 'bold' },
      footStyles: { fillColor: [229,231,235], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 6.5 },
      alternateRowStyles: { fillColor: lightGreen },
      columnStyles: { 0:{cellWidth:8}, 5:{cellWidth:8}, 6:{cellWidth:8} },
      margin: { left: 14, right: 14 },
      showFoot: 'lastPage',
    });
  }

  if (activeTab === 'pregnant' || activeTab === 'all') {
    if (activeTab === 'all') doc.addPage();
    addHeader('Pregnant Women – Head Count Survey', `Total: ${pregnant.length}`);
    addMeta(24);
    const calcAge = (dob) => dob ? Math.floor((new Date()-new Date(dob))/(365.25*86400000)) : '-';
    autoTable(doc, {
      startY: 28,
      head: [['HH#', 'Name', 'DOB', 'Age', 'Husband', 'Mobile', 'MCP/UWN', 'LMP', 'TD-1', 'TD-2', '1st ANC', '4th ANC']],
      body: pregnant.map(p => [
        p.hhNo||'-', p.name, p.dob||'-', calcAge(p.dob), p.husbandName, p.mobile, p.mcpCardUwn || '-',
        p.lmp||'-', p.td1||'-', p.td2||'-', p.anc1||'-', p.anc4||'-'
      ]),
      headStyles: { fillColor: [15, 118, 110], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6.5 },
      alternateRowStyles: { fillColor: [240, 253, 250] },
      margin: { left: 14, right: 14 },
    });
  }

  if (activeTab === 'children' || activeTab === 'all') {
    if (activeTab === 'all') doc.addPage();
    addHeader('Children (0–2 Years) – Immunization Record', `Total: ${children.length}`);
    addMeta(24);
    const calcAgeM = (dob) => {
      if (!dob) return '-';
      const d = new Date(dob), t = new Date();
      return (t.getFullYear()-d.getFullYear())*12+t.getMonth()-d.getMonth()+'m';
    };
    autoTable(doc, {
      startY: 28,
      head: [['HH#','Name','DOB','Age','Sex','Guardian','MCP/UWN','BCG','bOPV(B)','Penta1','Penta3','MR1','MR2','f-IPV B']],
      body: children.map(c => [
        c.hhNo||'-', c.name, c.dob||'-', calcAgeM(c.dob), c.gender,
        c.guardianName, c.mcpCardUwn || '-', c.BCG||'-', c.bOPV_birth||'-', 
        c.Penta1||'-', c.Penta3||'-',
        c.MR1||'-', c.MR2||'-', c.fIPV_booster||'-'
      ]),
      headStyles: { fillColor: [124, 45, 18], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6.5 },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      margin: { left: 14, right: 14 },
    });
  }

  const filename = activeTab === 'all' ? 'Survey_Full_Report.pdf' : `Survey_${activeTab}.pdf`;
  doc.save(filename);
}

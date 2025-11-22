// ... (Previous Scripts: Sidebar, Toast, State, Init, Data Handling, Helper) ...
// I will include only changed updateTotals and necessary surrounding functions for completeness.

let isSidebarOpen = true;
let isMobileCollapsed = false;

function initSidebar() {
  if (window.innerWidth >= 1024) {
    isSidebarOpen = true;
  } else {
    isSidebarOpen = true;
    isMobileCollapsed = false;
  }
  updateSidebarUI();
}
function toggleSidebar() {
  if (window.innerWidth < 1024) return;
  isSidebarOpen = !isSidebarOpen;
  updateSidebarUI();
  updateSidebarUI;
}
function toggleMobileSidebar() {
  if (window.innerWidth >= 1024) return;
  isMobileCollapsed = !isMobileCollapsed;
  updateSidebarUI();
}
function updateSidebarUI() {
  const container = document.getElementById('sidebarContainer');
  const collapsedBg = document.getElementById('collapsedBackground');
  const collapseBtn = document.getElementById('collapseBtn');
  const mobileArrow = document.getElementById('mobileCollapseArrow');

  if (isSidebarOpen) {
    container.classList.remove('sidebar-collapsed');
  } else {
    container.classList.add('sidebar-collapsed');
  }

  if (window.innerWidth >= 1024) {
    container.style.height = 'auto';
    container.classList.remove('mobile-collapsed');
    if (isSidebarOpen) {
      container.style.width = '24rem';
      collapsedBg.style.opacity = '0';
      collapseBtn.style.transform = 'rotate(0deg)';
      collapseBtn.classList.remove('text-white/80', 'hover:text-white');
      collapseBtn.classList.add('bg-white/10', 'text-white');
    } else {
      container.style.width = '4rem';
      collapsedBg.style.opacity = '1';
      collapseBtn.style.transform = 'rotate(180deg)';
      collapseBtn.classList.remove('bg-white/10');
      collapseBtn.classList.add('text-white/80', 'hover:text-white');
    }
  } else {
    container.style.width = '100%';
    container.classList.remove('sidebar-collapsed');
    if (isMobileCollapsed) {
      container.style.height = '60px';
      container.classList.add('mobile-collapsed');
    } else {
      container.style.height = '75vh';
      container.classList.remove('mobile-collapsed');
    }
  }
}
window.addEventListener('resize', () => {
  if (window.innerWidth >= 1024) {
    document.getElementById('sidebarContainer').style.height = 'auto';
    updateSidebarUI();
  } else {
    document.getElementById('sidebarContainer').style.width = '100%';
    document.getElementById('sidebarContainer').style.height = '75vh';
    isMobileCollapsed = false;
    document
      .getElementById('sidebarContainer')
      .classList.remove('sidebar-collapsed');
    updateSidebarUI();
  }
});

function showToast(message, type = 'normal') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  let bgClass = 'bg-gray-800';
  let icon = 'fa-info-circle';
  if (type === 'success') {
    bgClass = 'bg-emerald-600';
    icon = 'fa-check-circle';
  } else if (type === 'error') {
    bgClass = 'bg-red-500';
    icon = 'fa-exclamation-circle';
  }
  toast.className = `${bgClass} text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px] sm:min-w-[300px] toast-enter pointer-events-auto transform transition-all backdrop-blur-sm bg-opacity-95`;
  toast.innerHTML = `<i class="fa-solid ${icon} text-lg opacity-90"></i><span class="font-medium text-xs sm:text-sm leading-snug">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

let allCourses = [];
let scheduledCourseIds = new Set();
let scheduledCoursesMap = new Map();
let currentStartYear = 2025;
const PERIOD_MAP = { P1: 1, P2: 2, P3: 3, P4: 4 };
let pendingCourseToAdd = null;

document.addEventListener('DOMContentLoaded', () => {
  const yearInput = document.getElementById('startYearInput');
  yearInput.value = currentStartYear;
  updateYearLabels();
  initSidebar();
  document
    .getElementById('searchInput')
    .addEventListener('input', () => renderCourseList());
  document
    .getElementById('periodFilter')
    .addEventListener('change', () => renderCourseList());
  document
    .getElementById('fileInput')
    .addEventListener('change', handleFileUpload);
  yearInput.addEventListener('change', (e) => {
    currentStartYear = parseInt(e.target.value);
    updateYearLabels();
    renderCourseList();
  });
  document.onkeydown = function (evt) {
    evt = evt || window.event;
    if (evt.keyCode == 27) {
      closeModal();
      closeYearSelect();
    }
  };
});

function updateYearLabels() {
  document.getElementById('year1Label').textContent = `${currentStartYear}-${
    currentStartYear + 1
  }`;
  document.getElementById('year2Label').textContent = `${
    currentStartYear + 1
  }-${currentStartYear + 2}`;
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const json = JSON.parse(e.target.result);
      const processedCourses = processKTHData(json);
      allCourses = processedCourses;
      renderCourseList();
      showToast(
        `Successfully loaded ${processedCourses.length} courses`,
        'success'
      );
    } catch (error) {
      console.error('Error parsing JSON:', error);
      showToast(
        'File format error. Please upload a valid courses.json',
        'error'
      );
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function getAcademicYear(termCode) {
  const year = Math.floor(termCode / 10);
  const semester = termCode % 10;
  if (semester === 1) return year - 1;
  return year;
}

function processKTHData(rawData) {
  if (!Array.isArray(rawData)) return [];
  const flattenedCourses = [];
  const seenVariants = new Set();
  rawData.forEach((item) => {
    const info = item.detailedInformation || {};
    const course = info.course || {};
    const roundInfos = info.roundInfos || [];
    const syllabusVersions = info.publicSyllabusVersions || [];
    const latestSyllabus =
      syllabusVersions.length > 0 ? syllabusVersions[0].courseSyllabus : {};
    const description =
      latestSyllabus.content ||
      latestSyllabus.goals ||
      'No description available.';
    const examiners = info.examiners
      ? info.examiners.map((e) => `${e.givenName} ${e.lastName}`).join(', ')
      : 'N/A';
    const mainSubjects = info.mainSubjects
      ? info.mainSubjects.join(', ')
      : 'N/A';
    if (Array.isArray(roundInfos)) {
      roundInfos.forEach((r, index) => {
        const round = r.round || {};
        const terms = round.courseRoundTerms;
        if (!Array.isArray(terms) || terms.length === 0) return;
        const yearGroups = {};
        terms.forEach((t) => {
          if (!t.term || !t.term.term) return;
          const acYear = getAcademicYear(t.term.term);
          if (!yearGroups[acYear]) yearGroups[acYear] = { periodCredits: {} };
          const pc = yearGroups[acYear].periodCredits;
          if (t.creditsP1 > 0) pc['P1'] = (pc['P1'] || 0) + t.creditsP1;
          if (t.creditsP2 > 0) pc['P2'] = (pc['P2'] || 0) + t.creditsP2;
          if (t.creditsP3 > 0) pc['P3'] = (pc['P3'] || 0) + t.creditsP3;
          if (t.creditsP4 > 0) pc['P4'] = (pc['P4'] || 0) + t.creditsP4;
        });
        Object.entries(yearGroups).forEach(([acYearStr, group]) => {
          const acYear = parseInt(acYearStr);
          const periodCredits = group.periodCredits;
          if (Object.keys(periodCredits).length === 0) return;
          const periodSignature = Object.entries(periodCredits)
            .sort()
            .map((e) => `${e[0]}:${e[1]}`)
            .join('|');
          const variantKey = `${item.code}-${acYear}-${periodSignature}`;
          if (!seenVariants.has(variantKey)) {
            seenVariants.add(variantKey);
            const totalCredits = Object.values(periodCredits).reduce(
              (a, b) => a + b,
              0
            );
            const uniqueId = `${item.code}-${acYear}-${index}`;
            let isMandatory = false;
            if (Array.isArray(r.usage)) {
              r.usage.forEach((u) => {
                if (u.electiveCondition && u.electiveCondition.name === 'O')
                  isMandatory = true;
              });
            }
            flattenedCourses.push({
              id: uniqueId,
              code: item.code,
              name: item.name,
              startYear: acYear,
              periodCredits: periodCredits,
              totalCredits: totalCredits,
              level: course.educationalLevelCode || '',
              url: `https://www.kth.se/student/kurser/kurs/${item.code}?l=en`,
              description: description,
              isMandatory: isMandatory,
              examiners: examiners,
              mainSubjects: mainSubjects,
              language: round.language || 'N/A',
            });
          }
        });
      });
    }
  });
  return flattenedCourses;
}

function renderCourseList() {
  const listContainer = document.getElementById('courseList');
  listContainer.innerHTML = '';
  const searchText = document.getElementById('searchInput').value.toLowerCase();
  const periodFilter = document.getElementById('periodFilter').value;
  const courseCountEl = document.getElementById('courseCount');
  const courseCountMobileEl = document.getElementById('courseCountMobile');
  const nextYearCodes = new Set();
  allCourses.forEach((c) => {
    if (c.startYear === currentStartYear + 1) nextYearCodes.add(c.code);
  });
  const filteredCourses = allCourses.filter((c) => {
    if (scheduledCourseIds.has(c.id)) return false;
    if (c.startYear < currentStartYear) return false;
    const matchText =
      c.code.toLowerCase().includes(searchText) ||
      c.name.toLowerCase().includes(searchText);
    if (!matchText) return false;
    if (periodFilter && !c.periodCredits[periodFilter]) return false;
    return true;
  });
  filteredCourses.sort((a, b) => {
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    return a.startYear - b.startYear;
  });
  const countText = allCourses.length > 0 ? filteredCourses.length : '0';

  if (courseCountEl) courseCountEl.textContent = countText;
  if (courseCountMobileEl) courseCountMobileEl.textContent = countText;
  if (filteredCourses.length === 0 && allCourses.length > 0) {
    listContainer.innerHTML = `<div class="text-center mt-10 text-gray-300 text-sm"><p>No courses match your search.</p></div>`;
    return;
  }
  filteredCourses.forEach((course) => {
    const el = createSidebarCard(course, nextYearCodes);
    listContainer.appendChild(el);
  });
}

function createSidebarCard(course, nextYearCodes) {
  const card = document.createElement('div');
  card.className =
    'course-card p-4 flex flex-col gap-2 bg-white group hover:shadow-lg hover:border-brand/20 border-gray-200';
  card.dataset.course = JSON.stringify(course);
  const pStr = Object.keys(course.periodCredits).sort().join(', ') || 'No P';
  let yearLabel = '';
  let yearClass = '';
  let isFlexible = false;
  if (course.startYear === currentStartYear) {
    if (nextYearCodes.has(course.code)) {
      yearLabel = 'Year 1';
      yearClass = 'text-emerald-700 bg-emerald-50 border border-emerald-100';
    } else {
      yearLabel = 'Year 1 & 2';
      yearClass = 'text-[#000061] bg-[#e6e6ef] border border-[#000061]/10';
      isFlexible = true;
    }
  } else if (course.startYear === currentStartYear + 1) {
    yearLabel = 'Year 2';
    yearClass = 'text-amber-700 bg-amber-50 border border-amber-100';
  } else {
    yearLabel = `Year ${course.startYear}`;
    yearClass = 'text-gray-500 bg-gray-50 border border-gray-100';
  }

  card.dataset.flexible = isFlexible;
  card.innerHTML = `
            <div class="flex flex-col mb-2">
                <h3 class="text-sm font-bold text-gray-800 leading-snug mb-1" title="${course.name}" style="max-width: calc(100% - 64px)">${course.name}</h3>
                <div class="flex items-center gap-2 text-xs text-gray-500"><span class="font-semibold">${course.code}</span><span class="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">${course.totalCredits} hp</span></div>
            </div>
            <div class="flex justify-between items-center pt-3 mt-auto border-t border-gray-100">
                <div class="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider"><i class="fa-regular fa-clock"></i><span>${pStr}</span></div>
                <div class="flex items-center gap-2">
                    <button class="detail-btn w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-brand transition-colors border border-gray-200" title="Details"><i class="fa-solid fa-info text-xs"></i></button>
                    <button class="add-btn w-7 h-7 flex items-center justify-center rounded-full bg-brand text-white hover:bg-[#00004a] shadow-sm transition-colors" title="Add to Schedule"><i class="fa-solid fa-plus text-xs"></i></button>
                </div>
            </div>
            <div class="absolute top-4 right-4"><span class="text-[9px] font-bold px-2 py-0.5 rounded ${yearClass}">${yearLabel}</span></div>
        `;
  const detailBtn = card.querySelector('.detail-btn');
  const addBtn = card.querySelector('.add-btn');
  detailBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(course);
  });
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleAddToSchedule(course, isFlexible);
  });
  return card;
}

function handleAddToSchedule(course, isFlexible) {
  if (isFlexible) {
    pendingCourseToAdd = course;
    document
      .getElementById('yearSelectModal')
      .classList.remove('opacity-0', 'pointer-events-none');
  } else {
    let targetYearIndex = 1;
    if (course.startYear === currentStartYear + 1) {
      targetYearIndex = 2;
    } else if (course.startYear > currentStartYear + 1) {
      showToast(
        `Course start year ${course.startYear} is beyond current plan scope.`,
        'error'
      );
      return;
    }
    tryAddCourse(course, targetYearIndex);
  }
}
function closeYearSelect() {
  document
    .getElementById('yearSelectModal')
    .classList.add('opacity-0', 'pointer-events-none');
  pendingCourseToAdd = null;
}
function confirmYearSelect(yearIndex) {
  if (pendingCourseToAdd) {
    tryAddCourse(pendingCourseToAdd, yearIndex);
    closeYearSelect();
  }
}
function tryAddCourse(course, targetYearIndex) {
  const targetYearValue = currentStartYear + (targetYearIndex - 1);
  if (course.startYear > targetYearValue) {
    showToast(
      `Error: Course from ${course.startYear} cannot be taken in an earlier year (${targetYearValue}).`,
      'error'
    );
    return;
  }
  if (scheduledCourseIds.has(course.id)) {
    showToast(`This course instance is already scheduled.`, 'error');
    return;
  }
  let isDuplicateCodeInYear = false;
  for (let [id, info] of scheduledCoursesMap) {
    if (info.year === targetYearIndex && info.data.code === course.code) {
      isDuplicateCodeInYear = true;
      break;
    }
  }
  if (isDuplicateCodeInYear) {
    showToast(
      `Course ${course.code} is already scheduled in Year ${targetYearValue}.`,
      'error'
    );
    return;
  }
  addCourseToYear(course, targetYearIndex);
  showToast(`Added ${course.code} to Year ${targetYearIndex}`, 'success');
}

function addCourseToYear(courseData, yearIndex) {
  const groupId = `g-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const pKeys = Object.keys(courseData.periodCredits).sort();
  let blocks = [],
    currentBlock = [];
  const getIdx = (p) => PERIOD_MAP[p];
  pKeys.forEach((p) => {
    const idx = getIdx(p);
    if (currentBlock.length === 0) currentBlock.push(p);
    else {
      if (getIdx(currentBlock[currentBlock.length - 1]) + 1 === idx)
        currentBlock.push(p);
      else {
        blocks.push([...currentBlock]);
        currentBlock = [p];
      }
    }
  });
  if (currentBlock.length > 0) blocks.push(currentBlock);
  const grid = document.querySelector(
    `.schedule-grid[data-year="${yearIndex}"]`
  );
  blocks.forEach((block) => {
    let credits = 0;
    block.forEach((p) => (credits += courseData.periodCredits[p]));
    createScheduleCard(grid, courseData, block, credits, groupId, yearIndex);
  });
  scheduledCourseIds.add(courseData.id);
  scheduledCoursesMap.set(courseData.id, {
    year: yearIndex,
    data: courseData,
  });
  repackGrid(yearIndex);
  renderCourseList();
  updateTotals(yearIndex);
}

function createScheduleCard(
  container,
  data,
  blockPeriods,
  credits,
  groupId,
  yearIndex
) {
  const startP = blockPeriods[0];
  const startCol = PERIOD_MAP[startP];
  const span = blockPeriods.length;
  const el = document.createElement('div');
  const colors = stringToColor(data.code);
  el.className =
    'course-card p-2 sm:p-3 border border-gray-200 flex flex-col justify-between relative group hover:shadow-card-hover overflow-hidden';
  el.style.gridColumnStart = startCol;
  el.style.gridColumnEnd = `span ${span}`;
  el.style.background = 'white';
  const accentStrip = document.createElement('div');
  accentStrip.className = 'absolute left-0 top-0 bottom-0 w-1';
  accentStrip.style.backgroundColor = colors.text;
  el.appendChild(accentStrip);
  el.dataset.groupId = groupId;
  el.dataset.id = data.id;
  blockPeriods.forEach((p) => {
    el.dataset[`cred_${p}`] = data.periodCredits[p];
  });
  el.addEventListener('mouseenter', () => {
    document
      .querySelectorAll(`[data-group-id="${groupId}"]`)
      .forEach((c) => c.classList.add('card-hovered'));
  });
  el.addEventListener('mouseleave', () => {
    document
      .querySelectorAll(`[data-group-id="${groupId}"]`)
      .forEach((c) => c.classList.remove('card-hovered'));
  });

  el.innerHTML += `
              <div class="flex justify-between items-center pl-2 mb-1">
                <span class="font-bold text-[10px] sm:text-xs text-gray-800 leading-none truncate pr-1">
                    ${data.name}
                </span>
                <div class="flex gap-1">
                    <button class="sched-detail-btn text-gray-400 hover:text-brand opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <i class="fa-solid fa-info-circle text-xs"></i>
                    </button>
                    <button onclick="removeGroup('${groupId}', '${yearIndex}', '${data.id}')" class="text-red-400 hover:text-red-600 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <i class="fa-solid fa-times text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- 新增 flex 容器包住 code + credits -->
            <div class="flex justify-between items-center pl-2">
                <div class="text-[10px] font-medium text-gray-500 leading-tight truncate" title="${data.code}">
                    ${data.code}
                </div>

                <span class="text-[9px] sm:text-[10px] font-bold text-gray-400 bg-gray-50 px-1 sm:px-1.5 py-0.5 rounded border border-gray-100 whitespace-nowrap">
                    ${credits} hp
                </span>
            </div>
        `;
  container.appendChild(el);
  el.querySelector('.sched-detail-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(data);
  });
}

function repackGrid(yearIndex) {
  const grid = document.querySelector(
    `.schedule-grid[data-year="${yearIndex}"]`
  );
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.course-card'));
  const occupied = [];
  cards.forEach((card) => {
    const colStart = parseInt(card.style.gridColumnStart);
    const span = parseInt(card.style.gridColumnEnd.split(' ')[1]);
    let row = 0,
      placed = false;
    while (!placed) {
      if (!occupied[row]) occupied[row] = new Array(4).fill(false);
      let fits = true;
      for (let i = 0; i < span; i++) {
        if (occupied[row][colStart - 1 + i]) {
          fits = false;
          break;
        }
      }
      if (fits) {
        card.style.gridRowStart = row + 1;
        for (let i = 0; i < span; i++) occupied[row][colStart - 1 + i] = true;
        placed = true;
      } else row++;
    }
  });
}

function exportSchedule() {
  if (scheduledCourseIds.size === 0) {
    showToast('No courses to export.', 'error');
    return;
  }
  const exportData = {
    timestamp: new Date().toISOString(),
    startYear: currentStartYear,
    schedule: [],
  };
  scheduledCoursesMap.forEach((value, id) => {
    exportData.schedule.push({ id: id, yearIndex: value.year });
  });
  const dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(exportData));
  const node = document.createElement('a');
  node.href = dataStr;
  node.download = 'kth_plan.json';
  document.body.appendChild(node);
  node.click();
  node.remove();
  showToast('Schedule exported successfully!', 'success');
}
function importSchedule(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (allCourses.length === 0) {
    showToast('Please load courses.json first.', 'error');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const json = JSON.parse(e.target.result);
      if (json.startYear) {
        currentStartYear = json.startYear;
        document.getElementById('startYearInput').value = currentStartYear;
        updateYearLabels();
      }
      clearSchedule(false);
      let count = 0;
      json.schedule.forEach((item) => {
        const c = allCourses.find((course) => course.id === item.id);
        if (c) {
          addCourseToYear(c, item.yearIndex);
          count++;
        }
      });
      showToast(`Restored ${count} courses.`, 'success');
    } catch (err) {
      showToast('Load failed.', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
function clearSchedule(confirmAction = true) {
  if (confirmAction && !confirm('Clear schedule?')) return;
  document
    .querySelectorAll('.schedule-grid')
    .forEach((g) => (g.innerHTML = ''));
  scheduledCourseIds.clear();
  scheduledCoursesMap.clear();
  renderCourseList();
  updateTotals('1');
  updateTotals('2');
  if (confirmAction) showToast('Schedule cleared', 'normal');
}
function removeGroup(groupId, yearIndex, id) {
  const grid = document.querySelector(
    `.schedule-grid[data-year="${yearIndex}"]`
  );
  grid
    .querySelectorAll(`[data-group-id="${groupId}"]`)
    .forEach((c) => c.remove());
  if (id) {
    scheduledCourseIds.delete(id);
    scheduledCoursesMap.delete(id);
    renderCourseList();
  }
  repackGrid(yearIndex);
  updateTotals(yearIndex);
}

function updateTotals(yearIndex) {
  const grid = document.querySelector(
    `.schedule-grid[data-year="${yearIndex}"]`
  );
  const cards = grid.children;
  const totals = { P1: 0, P2: 0, P3: 0, P4: 0 };
  for (let c of cards) {
    if (c.dataset.cred_P1) totals.P1 += parseFloat(c.dataset.cred_P1);
    if (c.dataset.cred_P2) totals.P2 += parseFloat(c.dataset.cred_P2);
    if (c.dataset.cred_P3) totals.P3 += parseFloat(c.dataset.cred_P3);
    if (c.dataset.cred_P4) totals.P4 += parseFloat(c.dataset.cred_P4);
  }
  Object.keys(totals).forEach((p) => {
    const val = Math.round(totals[p] * 100) / 100;
    const badge = document.getElementById(`credits-${yearIndex}-${p}`);
    badge.textContent = `${val} hp`;
    if (val > 15)
      badge.className =
        'text-[10px] sm:text-xs font-bold text-red-500 bg-red-50 px-1.5 sm:px-2 py-1 rounded border border-red-100';
    else if (val > 0)
      badge.className =
        'text-[10px] sm:text-xs font-bold text-brand bg-brand-light px-1.5 sm:px-2 py-1 rounded border border-brand/10';
    else
      badge.className =
        'text-[10px] sm:text-xs font-bold text-gray-300 bg-gray-50 px-1.5 sm:px-2 py-1 rounded';
  });
  const s1 = Math.round((totals.P1 + totals.P2) * 100) / 100;
  const s2 = Math.round((totals.P3 + totals.P4) * 100) / 100;
  const e1 = document.getElementById(`sem-total-${yearIndex}-1`);
  const e2 = document.getElementById(`sem-total-${yearIndex}-2`);
  const c1 = document.getElementById(`sem-container-${yearIndex}-1`);
  const c2 = document.getElementById(`sem-container-${yearIndex}-2`);

  e1.textContent = `${s1} hp`;
  e2.textContent = `${s2} hp`;

  const baseClasses =
    'px-3 sm:px-4 py-1.5 rounded-full border shadow-sm text-[10px] sm:text-xs font-semibold flex-1 sm:flex-none text-center transition-colors duration-200';
  const normalClasses = 'bg-white border-gray-100 text-gray-600';
  const warningClasses = 'bg-red-500 border-red-500 text-white';

  if (s1 > 30) {
    c1.className = `${baseClasses} ${warningClasses}`;
    e1.className = 'text-white font-bold';
  } else {
    c1.className = `${baseClasses} ${normalClasses}`;
    e1.className = 'text-brand font-bold';
  }

  if (s2 > 30) {
    c2.className = `${baseClasses} ${warningClasses}`;
    e2.className = 'text-white font-bold';
  } else {
    c2.className = `${baseClasses} ${normalClasses}`;
    e2.className = 'text-brand font-bold';
  }
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return { text: `hsl(${hue}, 60%, 40%)` };
}
function openModal(course) {
  document.getElementById('modalTitle').textContent = course.name;

  document.getElementById('modalCode').textContent = `${course.code} • ${
    course.totalCredits || 'N/A'
  } hp`;
  document.getElementById('modalLink').href = course.url;
  document.getElementById('modalDescription').innerHTML = course.description;
  document.getElementById('modalExaminer').textContent =
    course.examiners || 'N/A';
  document.getElementById('modalSubject').textContent =
    course.mainSubjects || 'N/A';
  document.getElementById('modalLanguage').textContent =
    course.language || 'N/A';
  document.getElementById('modalStartYear').textContent =
    course.startYear || 'N/A';
  const pText = Object.entries(course.periodCredits)
    .map(
      ([p, c]) =>
        `<span class="mr-3 inline-block"><b class="text-gray-900">${p}:</b> ${c}hp</span>`
    )
    .join('');
  document.getElementById('modalPeriods').innerHTML =
    pText || 'No specific period data';

  const m = document.getElementById('courseModal');
  m.classList.remove('opacity-0', 'pointer-events-none');
  document.body.classList.add('modal-active');
}
function closeModal() {
  const m = document.getElementById('courseModal');
  m.classList.add('opacity-0', 'pointer-events-none');
  document.body.classList.remove('modal-active');
}

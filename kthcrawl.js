import fs from 'fs';

async function run() {
  const url = 'https://api.kth.se/api/kopps/v2/courses?l=en';
  const res = await fetch(url);

  if (!res.ok) {
    console.error('HTTP Error:', res.status);
    return;
  }

  const data = await res.json();
  const cleanData = data
    .filter((course) => course.state !== 'CANCELLED')
    .filter((course) =>
      course.department.includes('Människocentrerad teknologi')
    );

  console.log(`Found ${cleanData.length} courses. Fetching details...`);

  const detailedCourses = [];
  for (const course of cleanData) {
    try {
      const detailUrl = `https://api.kth.se/api/kopps/v2/course/${course.code}/detailedinformation?l=en`;
      const detailRes = await fetch(detailUrl);

      if (detailRes.ok) {
        const detailData = await detailRes.json();
        detailedCourses.push({
          ...course,
          detailedInformation: detailData,
        });
        console.log(`Fetched details for ${course.code}`);
      } else {
        console.error(
          `Failed to fetch details for ${course.code}: ${detailRes.status}`
        );
        detailedCourses.push(course); // Keep basic info if detail fetch fails
      }
    } catch (err) {
      console.error(`Error fetching details for ${course.code}:`, err);
      detailedCourses.push(course);
    }

    // Be polite to the API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 寫出成 JSON（帶縮排）
  fs.writeFileSync('courses.json', JSON.stringify(detailedCourses, null, 2));

  console.log('已輸出成 courses.json');
}

run();

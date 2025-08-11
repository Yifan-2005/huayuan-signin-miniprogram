const db = wx.cloud.database();

Page({
  data: {
    courseName: '',
    className: '',
    avgAbsentRate: 0,
    studentAbsent: [],
    loading: true,
  },

  async onLoad(options) {
    const courseName = decodeURIComponent(options.courseName || '');
    const className  = decodeURIComponent(options.className  || '');
    this.setData({ courseName, className, loading: true });

    // 1. 获取班级学生
    const classRes = await db.collection('class').where({ className }).get();
    const students = (classRes.data[0] && classRes.data[0].students) || [];

    // 2. 获取所有任务（线下+线上/视频），取出任务ID
    const taskRes = await db.collection('sign_tasks').where({
      courseName, className
    }).get();
    const tasks = taskRes.data;
    const totalTasks = tasks.length;
    const allTaskIds = tasks.map(t => t._id);

    // 3. 查所有签到记录（taskId 必须属于本班所有任务，不区分签到类型！）
    const recRes = await db.collection('sign_records').where({
      courseName,
      className,
      taskId: db.command.in(allTaskIds)
    }).get();
    console.log('所有签到记录:', recRes.data);
    const records = recRes.data;

    // 4. 统计每位学生缺勤次数（匹配 studentName 或 username）
    let absentTotal = 0;
    const studentAbsent = students.map(stu => {
      // 出勤的任务ID
      const attendTaskIds = new Set(
        records.filter(r =>
          r.studentName === stu.name || r.studentId === stu.username || r.username === stu.username
        ).map(r => r.taskId)
      );
      const absentCount = totalTasks - attendTaskIds.size;
      absentTotal += absentCount;
      return {
        name: stu.name,
        username: stu.username,
        absentCount
      };
    });

    // 5. 平均缺勤率
    let avgAbsentRate = 0;
    if (students.length && totalTasks) {
      avgAbsentRate = Math.round(absentTotal / (students.length * totalTasks) * 100);
    }

    this.setData({
      studentAbsent,
      avgAbsentRate,
      loading: false
    });
  }
});

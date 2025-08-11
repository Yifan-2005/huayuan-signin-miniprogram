const db = wx.cloud.database();

Page({
  data: {
    signTask: null,
    total: 0,
    present: [],
    absent: [],
    presentRate: 0,
    absentRate: 0,
    chartData: [],
    loading: true,
    className: '',
    courseName: ''
  },

  async onLoad(options) {
    const { signId } = options;
    if (!signId) {
      wx.showToast({ title: '缺少参数', icon: 'none' });
      return;
    }
    this.setData({ loading: true });

    try {
      //1. 获取签到任务
      const taskRes = await db.collection('sign_tasks').doc(signId).get();
      const task = taskRes.data;
      if (!task) throw new Error('未找到签到任务');

      //判断任务类型
      const isVideo = task.type === '线上签到' || !!task.videoFileID;
      this.setData({
        signTask: task,
        className: task.className,
        courseName: task.courseName
      });

      //2. 获取学生列表
      const classRes = await db.collection('class').where({ className: task.className }).get();
      const allStudents = (classRes.data[0] && classRes.data[0].students) || [];
      this.setData({ total: allStudents.length });

      //3. 只按 taskId 精确筛选签到记录！（关键修正）
      const recordWhere = {
        taskId: signId,
        type: isVideo ? '线上签到' : '线下签到'
      };

      const recordRes = await db.collection('sign_records').where(recordWhere).get();

      //统计 present/absent
      const presentNames = recordRes.data.map(item => item.studentName);
      const present = allStudents.filter(s => presentNames.includes(s.name));
      const absent = allStudents.filter(s => !presentNames.includes(s.name));
      const presentRate = allStudents.length ? Math.round((present.length / allStudents.length) * 100) : 0;
      const absentRate = 100 - presentRate;

      this.setData({
        present,
        absent,
        presentRate,
        absentRate,
        chartData: [
          { name: '到勤', value: present.length },
          { name: '缺勤', value: absent.length }
        ],
        loading: false
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
      console.error(e);
    }
  },
  exportAbsent() {
    const absentList = this.data.absent;
    if (!absentList.length) {
      wx.showToast({ title: '无缺勤名单', icon: 'none' });
      return;
    }
  
    //1. 拼接文本并加BOM头防乱码
    const lines = absentList.map((stu, idx) => `${idx+1}. ${stu.name}（${stu.username}）`);
    const content = '\uFEFF' + `缺勤名单\n${lines.join('\n')}`;
  
    //2. 写入本地文件系统
    const fs = wx.getFileSystemManager();
    const filePath = `${wx.env.USER_DATA_PATH}/absent_list.txt`;
    try {
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      return;
    }
  
    //3. 上传到云存储并获取下载链接
    const cloudPath = `absent_list_${Date.now()}.txt`;
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: res => {
        wx.openDocument({
          filePath,
          fileType: 'txt',
          success: () => {
            wx.showToast({ title: '已生成并打开', icon: 'success' });
          },
          fail: () => {
          }
        });
      },
      fail: () => {
        wx.showToast({ title: '上传云存储失败', icon: 'none' });
      }
    });
  }
  
});
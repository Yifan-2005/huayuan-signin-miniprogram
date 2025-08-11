Page({
  data: {
    courseName: '',
    className: '',
    title: '',
    desc: '',
    tempVideoPath: '',
    videoName: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    questionContent: '',
    options: [
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' }
    ],
    correctAnswer: '',
    correctAnswerIndex: 0,
    timeLimit: 30
  },
  onLoad(options) {
    //设置当前时间作为默认值
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    const currentDate = `${year}-${month}-${day}`;
    const currentTime = `${hours}:${minutes}`;
    
    //默认结束时间（当前时间+2小时）
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const endHours = endTime.getHours().toString().padStart(2, '0');
    const endMinutes = endTime.getMinutes().toString().padStart(2, '0');
    
    this.setData({
      courseName: decodeURIComponent(options.courseName || ''),
      className: decodeURIComponent(options.className || ''),
      startDate: currentDate,
      startTime: currentTime,
      endDate: currentDate,
      endTime: `${endHours}:${endMinutes}`,
      title: `${decodeURIComponent(options.courseName || '')}线上签到`
    });
  },
  
  //基本信息输入处理
  onInputCourse(e) { this.setData({ courseName: e.detail.value }) },
  onInputClass(e)  { this.setData({ className: e.detail.value }) },
  onInputTitle(e)  { this.setData({ title: e.detail.value }) },
  onInputDesc(e)   { this.setData({ desc: e.detail.value }) },
  
  //时间选择处理
  onStartDateChange(e) { this.setData({ startDate: e.detail.value }) },
  onStartTimeChange(e) { this.setData({ startTime: e.detail.value }) },
  onEndDateChange(e)   { this.setData({ endDate: e.detail.value }) },
  onEndTimeChange(e)   { this.setData({ endTime: e.detail.value }) },
  
  //问题设置处理
  onInputQuestionContent(e) { this.setData({ questionContent: e.detail.value }) },
  onInputOption(e) {
    const id = e.currentTarget.dataset.id;
    const value = e.detail.value;
    const options = this.data.options.map(option => {
      if (option.id === id) {
        return { ...option, text: value };
      }
      return option;
    });
    this.setData({ options });
  },
  onCorrectAnswerChange(e) {
    const index = e.detail.value;
    const correctAnswer = ['A', 'B', 'C', 'D'][index];
    this.setData({ 
      correctAnswer,
      correctAnswerIndex: index
    });
  },
  onTimeLimitChange(e) {
    this.setData({ timeLimit: e.detail.value });
  },

  //选择视频
  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: res => {
        this.setData({
          tempVideoPath: res.tempFiles[0].tempFilePath,
          videoName: res.tempFiles[0].originalFileObj ? res.tempFiles[0].originalFileObj.name : '已选择'
        })
      }
    })
  },

  //上传视频并创建线上签到任务
  uploadVideo() {
    const { 
      courseName, className, title, desc, tempVideoPath,
      startDate, startTime, endDate, endTime,
      questionTitle, questionContent, options, correctAnswer, timeLimit
    } = this.data;
    
    //验证必填字段
    if (!courseName || !className || !title || !tempVideoPath) {
      wx.showToast({ title: '请填写基本信息并选择视频', icon: 'none' }); 
      return;
    }
    
    if (!startDate || !startTime || !endDate || !endTime) {
      wx.showToast({ title: '请设置开始和结束时间', icon: 'none' }); 
      return;
    }
    
    if (!questionContent || !correctAnswer) {
      wx.showToast({ title: '请填写问题内容并选择正确答案', icon: 'none' }); 
      return;
    }
    
    //验证选项是否填写
    const emptyOptions = options.filter(option => !option.text);
    if (emptyOptions.length > 0) {
      wx.showToast({ title: '请填写所有选项内容', icon: 'none' }); 
      return;
    }
    
    //验证时间格式
    const startDateTime = new Date(`${startDate} ${startTime}`);
    const endDateTime = new Date(`${endDate} ${endTime}`);
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      wx.showToast({ title: '时间格式不正确', icon: 'none' }); 
      return;
    }
    
    if (endDateTime <= startDateTime) {
      wx.showToast({ title: '结束时间必须晚于开始时间', icon: 'none' }); 
      return;
    }
    
    wx.showLoading({ title: '上传中...' });

    //1. 先上传到云存储
    const cloudPath = `teacher_videos/${Date.now()}_${Math.floor(Math.random()*1000)}.mp4`;
    wx.cloud.uploadFile({
      cloudPath,
      filePath: tempVideoPath,
      success: uploadRes => {
        // 获取视频URL并保存
        wx.cloud.getTempFileURL({
          fileList: [uploadRes.fileID],
          success: urlRes => {
            const videoUrl = urlRes.fileList[0].tempFileURL;
            
            //2. 获取当前用户 openid
            wx.cloud.callFunction({
              name: 'getOpenId',
              success: res2 => {
                const db = wx.cloud.database();
                const teacherOpenid = res2.result.openid;
                
                //格式化时间
                const startTimeStr = `${startDate} ${startTime}`;
                const endTimeStr = `${endDate} ${endTime}`;
                
                //创建签到任务
                db.collection('sign_tasks').add({
                  data: {
                    title: title,                      //任务标题
                    courseName: courseName,           
                    className: className,             
                    desc: desc || '',                  //任务描述
                    startTime: startTimeStr,           
                    endTime: endTimeStr,               
                    createdAt: db.serverDate(),        //创建时间
                    teacherOpenid: teacherOpenid,       
                    type: '线上签到',              
                    status: '未开始',               
                    videoFileID: uploadRes.fileID,      //视频文件ID
                    videoUrl: videoUrl,                //保存视频URL
                    question: {                        
                      content: questionContent,        
                      options: options,                
                      correctAnswer: correctAnswer,     
                      timeLimit: timeLimit             
                    }
                  },
                  success: (res) => {
                    wx.hideLoading();
                    wx.showToast({ 
                      title: '发布成功', 
                      icon: 'success',
                      duration: 2000
                    });
                    
                    setTimeout(() => {
                      wx.navigateBack();
                    }, 2000);
                  },
                  fail: (err) => { 
                    wx.hideLoading(); 
                    console.error('创建签到任务失败:', err);
                    wx.showToast({ title: '创建任务失败', icon: 'none' }); 
                  }
                });
              },
              fail: (err) => { 
                wx.hideLoading(); 
                console.error('获取openid失败:', err);
                wx.showToast({ title: '获取用户信息失败', icon: 'none' }); 
              }
            });
          },
          fail: err => {
            wx.hideLoading();
            console.error('获取视频URL失败:', err);
            wx.showToast({ title: '获取视频URL失败', icon: 'none' });
          }
        });
      },
      fail: err => {
        wx.hideLoading();
        console.error('上传视频失败:', err);
        wx.showToast({ title: '上传视频失败', icon: 'none' });
      }
    });
  }
})
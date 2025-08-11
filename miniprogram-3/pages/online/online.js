//pages/online/online.js
const app = getApp();

Page({
  data: {
    taskId: null,
    taskInfo: null,
    videoSrc: '',
    videoContext: null,
    currentTime: 0,
    duration: 0,
    questionTimes: [],
    successCheckpointTime: 0,
    showQuestion: false,
    questionData: null,
    selectedAnswer: null,
    answered: false,
    answerResult: null,
    isFirstQuestionAnswered: false,
    signStatus: 'watching',
    timeoutTimer: null,
    hasShownFirstQuestion: false,
    hasShownSecondQuestion: false,
    questionTimesCalculated: false,
    remainingTime: 0,
    countdownTimer: null,
    failedDueToExpiration: false, //表示是否因为过期导致的失败
    isExpiredTask: false, //表示任务是否已过期，用于控制进度条遮罩层
  },

  onLoad: function(options) {
    const taskId = options.id;
    this.checkTaskAvailability(taskId);
    this.setData({ taskId });
    this.getTaskInfo(taskId);
    
    this.checkSignStatus(taskId);
  },
  
  checkSignStatus: function(taskId) {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo._openid) return;
    
    const db = wx.cloud.database();
    
    db.collection('sign_records')
      .where({
        _openid: userInfo._openid,
        taskId: taskId.toString()
      })
      .get()
      .then(res => {
        if (res.data && res.data.length > 0) {
          this.setData({
            signStatus: 'success'
          });
        } else {
          //检查任务是否过期
          db.collection('sign_tasks').doc(taskId).get().then(taskRes => {
            if (taskRes.data) {
              const task = taskRes.data;
              const now = new Date();
              const endDateTime = new Date(task.endTime);
              
              if (endDateTime < now) {
                this.setData({
                  signStatus: 'failed',
                  failedDueToExpiration: true,  //表示是因为过期导致的失败
                  isExpiredTask: true          
                });
              }
              //如果任务未过期且未签到，保持默认的watching状态
            }
          });
        }
      });
  },
  
  checkTaskAvailability: function(taskId) {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.class) return;
    
    //先检查本地缓存
    const tasks = wx.getStorageSync('signTasks') || [];
    if (tasks.length) {
      const task = tasks.find(t => t.id == taskId);
      const statusMessages = {
        '未开始': { title: '任务未开始', content: '该签到任务尚未开始，请在开始时间后再进行签到。' }
      };
      
      const statusMsg = task && statusMessages[task.status];
      if (statusMsg) {
        wx.showModal({
          title: statusMsg.title,
          content: statusMsg.content,
          showCancel: false,
          success: (res) => {
            if (res.confirm) wx.navigateBack();
          }
        });
        return;
      }
    }
  },
  
  onReady: function() {
    this.videoContext = wx.createVideoContext('signVideo');
  },
  
  //监听全屏模式变化
  onFullScreenChange: function(e) {
    const isFullScreen = e.detail.fullScreen;

    //将全屏状态保存到数据中
    this.setData({ isFullScreen: isFullScreen });
    
    //如果当前有问题弹窗显示，确保视频暂停
    if (this.data.showQuestion) {
      this.videoContext.pause();
    }
  },
  
  calculateQuestionTimes: function(duration) {
    if (!duration || duration <= 0 || this.data.questionTimesCalculated) return;
    
    const oneThird = Math.floor(duration / 3);
    const firstQuestionTime = Math.max(5, oneThird); //第一个问题：三分之一
    const successCheckpointTime = duration; //签到成功时间点
    const secondQuestionTime = Math.floor(duration * 2 / 3); //第二个问题：三分之二
    
    this.setData({
      questionTimes: [firstQuestionTime, secondQuestionTime],
      successCheckpointTime,
      questionTimesCalculated: true,
      currentQuestionIndex: 0
    });
    
    //计算问题时间点
  },
  
  getTaskInfo: function(taskId) {
    wx.showLoading({ title: '加载任务信息...' });
    
    const db = wx.cloud.database();
    db.collection('sign_tasks').doc(taskId).get()
      .then(res => {
        wx.hideLoading();
        const task = res.data;
        
        if (!task) {
          wx.showToast({ title: '任务不存在', icon: 'none' });
          return;
        }
        
        if (task.videoFileID) {
          console.log('开始获取视频URL, fileID:', task.videoFileID);
          wx.cloud.getTempFileURL({
            fileList: [task.videoFileID],
            success: res => {
              if (res.fileList && res.fileList.length > 0) {
                const videoSrc = res.fileList[0].tempFileURL;
                
                //确保视频URL有效
                if (videoSrc && videoSrc.length > 0) {
                  this.setData({ videoSrc });
                  
                  //初始化视频上下文
                  setTimeout(() => {
                    const videoContext = wx.createVideoContext('signVideo', this);
                    this.setData({ videoContext });
                    //初始化视频上下文成功
                  }, 500);
                } else {
                  console.error('获取到的视频URL无效');
                  wx.showToast({ title: '视频URL无效', icon: 'none' });
                }
              } else {
                console.error('获取视频URL响应不包含文件列表');
                wx.showToast({ title: '获取视频失败', icon: 'none' });
              }
            },
            fail: err => {
              console.error('获取视频URL失败:', err);
              wx.showToast({ title: '获取视频失败', icon: 'none' });
            }
          });
        } else {
          console.error('任务中没有视频文件ID');
          wx.showToast({ title: '任务没有视频', icon: 'none' });
        }
        
        const taskInfo = {
          id: taskId,
          title: task.title || '线上签到任务',
          desc: task.desc || '观看视频并回答问题完成签到',
          questions: []
        };
        
        if (task.question) {
          taskInfo.questions.push({
            id: 1,
            title: task.question.title || '签到问题',
            content: task.question.content || '请回答以下问题',
            options: task.question.options || [],
            correctAnswer: task.question.correctAnswer || '',
            timeLimit: task.question.timeLimit || 30
          });
        } else {
          wx.showToast({
            title: '任务数据不完整',
            icon: 'none'
          });
        }
        
        this.setData({ 
          taskInfo,
          courseName: task.courseName || '',   
          className: task.className || ''
        });
        
      })
      .catch(err => {
        wx.hideLoading();
        console.error('获取任务信息失败:', err);
        wx.showToast({ title: '获取任务信息失败', icon: 'none' });
      });
  },
  
  onTimeUpdate: function(e) {
    const { currentTime, duration } = e.detail;
    const watchProgress = duration > 0 ? Math.floor((currentTime / duration) * 100) : 0;
    
    this.setData({ currentTime, duration, watchProgress });
    
    if (duration > 0 && !this.data.questionTimesCalculated) {
      this.calculateQuestionTimes(duration);
    }
    
    this.checkQuestionTime(currentTime);
    this.checkSignSuccess(currentTime);
  },
  checkSignSuccess: function(currentTime) {
    const { successCheckpointTime, isFirstQuestionAnswered, signStatus, hasShownFirstQuestion, questionTimesCalculated } = this.data;
    
    if (!questionTimesCalculated || !successCheckpointTime || signStatus === 'success' || signStatus === 'failed') {
      return;
    }
    
    const currentTimeInt = Math.floor(currentTime);
    
    if (currentTimeInt >= successCheckpointTime && isFirstQuestionAnswered && hasShownFirstQuestion) {
      this.setData({ signStatus: 'success' });
      this.recordSignSuccess();
      wx.showToast({
        title: '签到成功！',
        icon: 'success',
        duration: 2000
      });
    }
  },
  
  //检查是否到达问题时间点
  checkQuestionTime: function(currentTime) {
    const { questionTimes, showQuestion, isFirstQuestionAnswered, signStatus, hasShownFirstQuestion, hasShownSecondQuestion } = this.data;
    
    //如果问题时间点还没有计算出来，则返回
    if (!this.data.questionTimesCalculated || !questionTimes || questionTimes.length < 2) {
      return;
    }
    
    //如果已经签到成功或失败，则不再弹出问题
    if (signStatus === 'success' || signStatus === 'failed') {
      return;
    }
    
    //如果已经显示问题，则不处理
    if (showQuestion) {
      return;
    }
    
    //当前时间的整数部分
    const currentTimeInt = Math.floor(currentTime);
    
    //检查是否到达第一个问题时间点（视频三分之一处附近）
    if (!hasShownFirstQuestion && currentTimeInt === questionTimes[0]) {
      //触发第一次问题
      //暂停视频
      this.videoContext.pause();
      this.showQuestion(0);
      
      //标记已经显示过第一次问题
      this.setData({
        hasShownFirstQuestion: true
      });
      return;
    }
    
    if (!hasShownSecondQuestion && !isFirstQuestionAnswered && currentTimeInt === questionTimes[1]) {
 
      this.videoContext.pause();
      this.showQuestion(0);
      
      this.setData({
        hasShownSecondQuestion: true
      });
      return;
    }
  },
  
  //显示问题
  showQuestion: function(questionIndex) {
    const { taskInfo } = this.data;
    const questionData = taskInfo.questions[questionIndex];
    
    //如果当前是全屏模式，先退出全屏
    if (this.data.isFullScreen) {
      //检测到全屏模式，自动退出全屏以显示问题
      this.videoContext.exitFullScreen();
      
      //等待退出全屏后再显示问题
      setTimeout(() => {
        this.videoContext.pause();
        
        this.setData({
          showQuestion: true,
          questionData: questionData,
          selectedAnswer: null,
          answered: false,
          answerResult: null,
          currentQuestionIndex: questionIndex
        });
        
        //开始问题计时器
        this.startQuestionTimer(questionData.timeLimit);
        
        //显示问题
      }, 500); 
    } else {
      //直接显示问题
      this.videoContext.pause();
      
      this.setData({
        showQuestion: true,
        questionData: questionData,
        selectedAnswer: null,
        answered: false,
        answerResult: null,
        currentQuestionIndex: questionIndex
      });
      
      //开始问题计时器
      this.startQuestionTimer(questionData.timeLimit);
      
      console.log('显示第', questionIndex + 1, '个问题:', questionData.content);
    }
  },
  
  //开始问题计时器
  startQuestionTimer: function(timeLimit) {
    //清除之前的计时器
    if (this.data.timeoutTimer) {
      clearTimeout(this.data.timeoutTimer);
    }
    
    //清除之前的倒计时计时器
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
    
    //设置倒计时初始值
    this.setData({
      remainingTime: timeLimit
    });
    
    //创建倒计时器，每秒更新一次
    const countdownTimer = setInterval(() => {
      if (this.data.remainingTime > 0) {
        this.setData({
          remainingTime: this.data.remainingTime - 1
        });
      } else {
        //到达0秒时清除倒计时器
        clearInterval(this.data.countdownTimer);
      }
    }, 1000);
    
    //设置超时计时器
    const timeoutTimer = setTimeout(() => {
      //如果还没回答，则视为超时
      if (!this.data.answered) {
        this.handleTimeout();
      }
    }, timeLimit * 1000);
    
    this.setData({
      timeoutTimer: timeoutTimer,
      countdownTimer: countdownTimer
    });
  },
  
  selectAnswer: function(e) {
    const answerId = e.currentTarget.dataset.id;
    
    this.setData({
      selectedAnswer: answerId
    });
  },
  
  submitAnswer: function() {
    if (!this.data.selectedAnswer) {
      return;
    }
    
    this.answerQuestion();
  },
  
  //处理用户回答
  answerQuestion: function() {
    const selectedOption = this.data.selectedAnswer;
    const currentQuestion = this.data.taskInfo.questions[0]; // 始终使用第一个问题
    
    //判断答案是否正确
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    
    //清除倒计时计时器
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
    
    //清除超时计时器
    if (this.data.timeoutTimer) {
      clearTimeout(this.data.timeoutTimer);
    }
    
    //关闭问题弹窗
    this.setData({
      showQuestion: false,
      questionData: null,
      answered: true,
      countdownTimer: null,
      timeoutTimer: null
    });
    
    if (isCorrect) {
      //回答正确
      wx.showToast({
        title: '回答正确',
        icon: 'success',
        duration: 1500
      });
      
      //更新问题回答状态
      this.setData({
        isFirstQuestionAnswered: true
      });
      
      //继续播放视频
      setTimeout(() => {
        this.videoContext.play();
      }, 1500);
    } else {
      //回答错误，显示正确答案
      const correctAnswer = currentQuestion.correctAnswer;
      const correctOptionText = currentQuestion.options.find(option => option.id === correctAnswer).text;
      
      //如果是第二次回答问题依然错误，则签到失败
      if (this.data.hasShownSecondQuestion) {
        this.setData({
          signStatus: 'failed'
        });
        
        //更新签到记录
        this.updateSignRecord(this.data.taskId, 'failed');
        
        //显示失败提示和正确答案
        wx.showModal({
          title: '签到失败',
          content: `回答错误，正确答案是：${correctAnswer}. ${correctOptionText}。签到失败，请重新完成签到。`,
          showCancel: false,
          success: (res) => {
            if (res.confirm) {
              //返回首页并更新签到状态
              this.updateSignStatusAndGoBack();
            }
          }
        });
      } else {
        //第一次回答错误，显示正确答案并继续播放视频
        wx.showModal({
          title: '回答错误',
          content: `正确答案是：${correctAnswer}. ${correctOptionText}。请继续观看视频，在视频三分之二处将再次有机会回答。`,
          showCancel: false,
          success: (res) => {
            if (res.confirm) {
              this.videoContext.play();
            }
          }
        });
      }
    }
  },
  
  //处理超时情况
  handleTimeout: function() {
    const { currentQuestionIndex } = this.data;
    const questionData = this.data.questionData;
    
    //清除倒计时计时器
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
    
    //更新问题状态
    this.setData({
      answered: true,
      answerResult: 'timeout',
      showQuestion: false,
      countdownTimer: null
    });
    
    wx.showToast({
      title: '回答超时',
      icon: 'none',
      duration: 2000
    });
    
    if ((currentQuestionIndex === 0 && this.data.currentTime >= this.data.questionTimes[1]) || 
        currentQuestionIndex === 1) {
      this.setData({
        signStatus: 'failed'
      });
      
      //更新签到记录
      this.updateSignRecord(this.data.taskId, 'failed');
      
      //显示失败提示
      setTimeout(() => {
        wx.showModal({
          title: '签到失败',
          content: '回答超时，签到失败。请重新完成签到。',
          showCancel: false,
          success: (res) => {
            if (res.confirm) {
              this.updateSignStatusAndGoBack();
            }
          }
        });
      }, 2500);
    } else {
      //第一个问题超时，继续播放视频，在三分之二处再次弹出
      setTimeout(() => {
        this.videoContext.play();
      }, 2000);
    }
  },
  
  recordSignSuccess: function() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.class) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
  
    this.updateSignRecord(this.data.taskId, 'success');
  
    const db = wx.cloud.database();
  
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const second = now.getSeconds().toString().padStart(2, '0');
    const formattedTime = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  
    const studentId = userInfo.username || '';  //通常学号存在 username 字段
    const studentName = userInfo.name || '';    //姓名
  
    const taskId = this.data.taskId ? this.data.taskId.toString() : '';
    db.collection('sign_records').add({
      data: {
        className: userInfo.class,
        courseName: this.data.courseName, 
        signTime: formattedTime,
        signTimeStamp: now.getTime(),
        type: '线上签到',
        taskId: taskId,
        studentId: studentId,
        studentName: studentName
      }
    }).then(() => {
      db.collection('students')
    .where({ _openid: userInfo._openid })
    .update({
      data: {
        score: db.command.inc(1) //每次签到 +1
      }
    })
    .then(() => {
      //更新首页签到状态
      this.updateIndexPageSignStatus('success');
      wx.setStorageSync('signSuccessFlag', true);
      wx.showToast({
        title: '签到成功，积分+1！',
        icon: 'success',
        duration: 2000
      });
    }).catch(() => {
      wx.showToast({
        title: '积分更新失败',
        icon: 'none'
      });
    });
    }).catch(err => {
      console.error('保存签到记录失败', err);
      wx.showToast({
        title: '签到失败，请重试',
        icon: 'none'
      });
    });
  },
  
  updateIndexPageSignStatus: function(status) {
    //直接从缓存中获取任务列表并更新
    let tasks = wx.getStorageSync('signTasks') || [];
    
    //查找当前任务并更新状态
    const taskIndex = tasks.findIndex(t => t.id == this.data.taskId);
    
    if (taskIndex !== -1) {
      //更新状态
      tasks[taskIndex].status = status === 'success' ? '已签到' : '签到失败';
      
      //保存到缓存
      wx.setStorageSync('signTasks', tasks);
      console.log('更新任务状态成功，任务ID:', this.data.taskId, '新状态:', tasks[taskIndex].status);
    } else {
      console.log('未找到当前任务，任务ID:', this.data.taskId);
    }
    
    //将签到状态保存到缓存
    const todaySignStatus = status === 'success' ? 'completed' : 'failed';
    wx.setStorageSync('todaySignStatus', todaySignStatus);
    wx.setStorageSync('lastSignTaskId', this.data.taskId);
  },
  
    //更新本地签到记录
  updateSignRecord: function(taskId, status) {
    //获取现有记录
    let records = wx.getStorageSync('signRecords') || [];
    
    //添加新记录
    records.push({
      taskId: taskId,
      date: new Date().toISOString(),
      status: status,
      title: this.data.taskInfo ? this.data.taskInfo.title : '线上课程'
    });
    
    //保存记录
    wx.setStorageSync('signRecords', records);
  },
  
  onVideoPlay: function() {
  },
  
  onVideoEnded: function() {
    if (this.data.signStatus === 'watching') {
      if (this.data.isFirstQuestionAnswered) {
        this.setData({
          signStatus: 'success'
        });
        
        this.recordSignSuccess();
        
        wx.showModal({
          title: '签到成功',
          content: '您已成功完成签到！',
          showCancel: false
        });
      } else {
        this.setData({
          signStatus: 'failed'
        });
        
        this.updateSignRecord(this.data.taskId, 'failed');
        
        wx.showModal({
          title: '签到失败',
          content: '您未能正确回答问题，签到失败。请重新完成签到。',
          showCancel: false
        });
      }
    }
  },
  
  onVideoError: function(e) {
    console.error('视频播放错误:', e.detail.errMsg);

    wx.showModal({
      title: '视频加载失败',
      content: '无法加载视频，请检查网络连接或稍后重试。',
      showCancel: false
    });
  }
});
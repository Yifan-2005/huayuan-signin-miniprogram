//云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) 
const db = cloud.database()

//云函数入口函数
exports.main = async (event, context) => {
  const { userType, username, newPassword } = event
  
  try {
    //根据用户类型选择集合
    const collection = userType === 'student' ? 'students' : 'teachers'
    
    //查询用户是否存在
    const userResult = await db.collection(collection).where({ username }).get()
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    //更新密码
    const updateResult = await db.collection(collection).where({ username }).update({
      data: {
        password: newPassword
      }
    })
    
    if (updateResult.stats.updated > 0) {
      return {
        success: true,
        message: '密码重置成功'
      }
    } else {
      return {
        success: false,
        message: '密码重置失败'
      }
    }
  } catch (error) {
    console.error('重置密码时出错：', error)
    return {
      success: false,
      message: '系统错误，请稍后再试'
    }
  }
}

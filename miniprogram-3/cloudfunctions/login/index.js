
// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })  // 或指定具体 env
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  return { openid: wxContext.OPENID }
}

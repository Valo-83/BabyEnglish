App({
  onLaunch() {
    console.log('英语点读小程序启动')
  },
  onError(err) {
    console.error('全局错误:', err)
  },
  globalData: {
    userInfo: null
  }
})

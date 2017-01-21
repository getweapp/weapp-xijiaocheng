function formatTime(time) {
  if (typeof time !== 'number' || time < 0) {
    return time
  }

  const date = new Date(time)

  const year = date.getFullYear()
  const month = date.getMonth()+1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

/*
  var hour = parseInt(time / 3600)
  time = time % 3600
  var minute = parseInt(time / 60)
  time = time % 60
  var second = time
  */

  return year+'-'+month+'-'+day+' '+([hour, minute, second]).map(function (n) {
    n = n.toString()
    return n[1] ? n : '0' + n
  }).join(':')
}

// function countdown(time) {

//     if (typeof time !== 'number' || time < 0) {
//         return time
//     }
//     setInterval(function(){
//         return (time/1000) - 1
//     }, 1000)
// }

module.exports = {
  formatTime: formatTime,
  // countdown: countdown
}

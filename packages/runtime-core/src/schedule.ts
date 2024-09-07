
let queue: any[] = []
let isFlushPending = false

let P = Promise.resolve()

export function nextTick (fn) {
  return fn ? P.then(fn) : P
}

export function queueJob(job) {
  if ( !queue.includes(job)) {
    queue.push(job)
  }

  flushJobs()
}

function flushJobs() {
  if ( isFlushPending ) return
  isFlushPending = true

  nextTick(flush)
}


function flush() {
  isFlushPending = false
  let job
  while( job = queue.shift() ) {
    job && job()
  }
}


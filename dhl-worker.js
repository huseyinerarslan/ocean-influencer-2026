'use strict';

// Claim only jobs inserted with a new order. The lease expires after a server restart.
const claim = `UPDATE dhl_sandbox_jobs SET due_at=NOW()+INTERVAL '2 minutes'
  WHERE (order_id,group_no) IN (SELECT order_id,group_no FROM dhl_sandbox_jobs
    WHERE due_at<=NOW() ORDER BY due_at,order_id LIMIT 3 FOR UPDATE SKIP LOCKED)
  RETURNING order_id,group_no,packages,attempts`;

async function processJob(pool, actions, job) {
  const id = job.order_id;
  async function schedule(seconds, count = 0) {
    await pool.query("UPDATE dhl_sandbox_jobs SET due_at=NOW()+$2 * INTERVAL '1 second',attempts=attempts+$3 WHERE order_id=$1 AND group_no=$4", [id,seconds,count,job.group_no]);
  }
  try {
    const row = await actions.prepare(id, job.group_no);
    if (row.state !== 'READY') {
      if (!['PREPARED','WAITING'].includes(row.state)) throw Error();
      const remaining = Math.ceil((new Date(row.attempted_at).getTime()+30000-Date.now())/1000);
      if (remaining > 0) return await schedule(remaining);
      const label = await actions.create(id, job.packages, job.group_no);
      if (label.state === 'WAITING' && job.attempts < 4) return await schedule(60,1);
      if (label.state !== 'READY') throw Error();
    }
    await pool.query('DELETE FROM dhl_sandbox_jobs WHERE order_id=$1 AND group_no=$2', [id,job.group_no]);
  } catch (err) {
    if (err.status === 409 && err.message.includes('devam ediyor')) return schedule(5);
    const message = err.status ? err.message : 'DHL barkodu için sipariş detayını kontrol edin.';
    await pool.query('UPDATE dhl_sandbox_jobs SET due_at=NULL,error=$2 WHERE order_id=$1 AND group_no=$3',[id,message,job.group_no]);
  }
}
function start(pool, actions) {
  async function tick() {
    try {
      const {rows} = await pool.query(claim);
      await Promise.allSettled(rows.map(job => processJob(pool, actions, job)));
    } catch { console.error('DHL test kuyruğu okunamadı.'); }
    setTimeout(tick, 3000).unref();
  }
  void tick();
}
module.exports = {start, processJob};

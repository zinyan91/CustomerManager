(() => {
  const { fmt, icon, shell, kpi } = window.UI;
  const Q = window.REF.quiz;
  shell();
  let i = 0;
  let picked = new Set();
  let checked = false;
  const score = { right: 0, done: 0 };

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Ôn tập nghiệp vụ</h1>
      <div class="actions"><button class="btn" type="button">${icon('plus')}Thêm câu hỏi</button></div>
    </div>
    <section class="kpis three" aria-label="Ngân hàng câu hỏi">
      ${kpi({ tone: 'neutral', label: 'Ngân hàng câu hỏi', value: fmt.money(Q.total), unit: 'câu', note: `Lượt này ${Q.sample.length} câu` })}
      ${kpi({ tone: 'neutral', label: 'Câu nhiều đáp án', value: Q.multi, unit: 'câu', note: `${fmt.pct((Q.multi / Q.total) * 100)} ngân hàng câu hỏi` })}
      ${kpi({ tone: Q.open ? 'warn' : 'pos', label: 'Câu chưa chốt đáp án', value: Q.open, unit: 'câu', note: Q.open ? 'Cần bổ sung đáp án đúng' : 'Đã chốt đủ' })}
    </section>
    <section class="card quiz" aria-labelledby="h-q" id="card"></section>`;

  function render() {
    const q = Q.sample[i];
    const multi = q.correct_answers.length > 1;
    const right = checked && q.correct_answers.length === picked.size && q.correct_answers.every((a) => picked.has(a));
    document.querySelector('#card').innerHTML = `
      <div class="card-head"><h2 id="h-q" class="num">Câu ${q.id}</h2><span class="meta num">${i + 1} / ${Q.sample.length} câu luyện tập · đúng ${score.right}/${score.done}</span></div>
      <div class="card-body">
        <p class="question">${fmt.esc(q.question)}</p>
        <p class="muted" style="margin:6px 0 0;font-size:13px">${multi ? 'Câu nhiều đáp án' : 'Câu một đáp án'} · nguồn ${fmt.esc(q.sources.join(', '))}</p>
        <div class="options" role="group" aria-label="Các lựa chọn">${q.options.map((o) => {
          const isRight = q.correct_answers.includes(o.id);
          const st = !checked ? (picked.has(o.id) ? 'on' : '') : isRight ? 'right' : picked.has(o.id) ? 'wrong' : '';
          return `<button type="button" class="option ${st}" data-opt="${o.id}" aria-pressed="${picked.has(o.id)}" ${checked ? 'disabled' : ''}><b>${o.id}</b><span>${fmt.esc(o.text)}</span></button>`;
        }).join('')}</div>
        <div class="quiz-foot">
          ${checked ? `<span class="pill ${right ? 'pos' : 'neg'}">${right ? 'Đúng' : `Sai · đáp án ${q.correct_answers.join(', ')}`}</span>` : '<span></span>'}
          ${checked ? '<button class="btn primary" type="button" data-next>Câu tiếp theo</button>' : `<button class="btn primary" type="button" data-check ${picked.size ? '' : 'disabled'}>Kiểm tra</button>`}
        </div>
      </div>`;
  }

  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-opt]');
    if (o && !checked) {
      const q = Q.sample[i];
      if (q.correct_answers.length > 1) picked.has(o.dataset.opt) ? picked.delete(o.dataset.opt) : picked.add(o.dataset.opt);
      else picked = new Set([o.dataset.opt]);
      render();
      return;
    }
    if (e.target.closest('[data-check]')) {
      const q = Q.sample[i];
      checked = true;
      score.done++;
      if (q.correct_answers.length === picked.size && q.correct_answers.every((a) => picked.has(a))) score.right++;
      render();
      return;
    }
    if (e.target.closest('[data-next]')) { i = (i + 1) % Q.sample.length; picked = new Set(); checked = false; render(); }
  });
  render();
})();

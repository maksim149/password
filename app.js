// Поведение сайта «Надёжный пароль». Один файл на все страницы: элементы ищутся
// по разметке, и если на странице их нет — блок молча ничего не делает.
// ⛔ ЛЮБОЕ нажатие обязано что-то менять (§7 конституции сайта): у переключателя
// и теста нет состояния «выбрано по умолчанию, нажатие ничего не меняет».
// ⛔ СТ-Ф1: файл ничего не грузит извне и никуда не отправляет данные. Расчёт
// пароля (И2) целиком идёт в переменных этой функции и нигде не сохраняется —
// ни в localStorage, ни в куки, ни в сетевом запросе.

// ——— И7: переключатель «как это делают» (страница «Как это делают»)
(function () {
  var box = document.querySelector('[data-tool="И7"]');
  if (!box) return;
  var DATA = {
    perebor: {
      t: 'Полный перебор',
      p: 'Проверяет все комбинации подряд — от первой до последней возможной. Не ' +
         'зависит от того, что вы придумали, только от длины и набора знаков. Для ' +
         '«Dima2008» это 2,18×10¹⁴ вариантов — 16,5 минуты при скорости 220 ' +
         'миллиардов вариантов в секунду.'
    },
    spisok: {
      t: 'Список вероятных комбинаций',
      p: 'Проверяет сначала то, что люди выбирают чаще всего: слова языка, имена, ' +
         'даты, привычные замены букв похожими знаками. Имя «Dima» и год «2008» ' +
         'стоят в таком списке одними из первых — «Dima2008» здесь не продержится ' +
         'и секунды, хотя полный перебор занял бы почти семнадцать минут.'
    },
    utechka: {
      t: 'Подстановка пар из утечек',
      p: 'Не перебирает вообще ничего: берёт уже известную пару «адрес почты — ' +
         'пароль» из чужой утечки и пробует её на другом сайте. Стойкость самого ' +
         'пароля значения не имеет — работает подстановка готового, а не взлом.'
    }
  };
  var out = box.querySelector('.out');
  box.querySelectorAll('.switch button').forEach(function (b) {
    b.addEventListener('click', function () {
      box.querySelectorAll('.switch button').forEach(function (x) {
        x.classList.toggle('on', x === b);
      });
      var d = DATA[b.getAttribute('data-k')];
      out.innerHTML = '<b>' + d.t + '</b>' + d.p;
      box.querySelectorAll('.scheme [data-lane]').forEach(function (l) {
        l.classList.toggle('on', l.getAttribute('data-lane') === b.getAttribute('data-k'));
      });
    });
  });
})();

// ——— И1: тест «какой крепче» (страница «Проверить себя»)
(function () {
  var box = document.querySelector('[data-tool="И1"]');
  if (!box) return;
  var done = 0, right = 0;
  var qs = box.querySelectorAll('.q');
  qs.forEach(function (q) {
    var why = q.querySelector('.why');
    q.querySelectorAll('.opts button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (q.dataset.answered) return;
        q.dataset.answered = '1';
        done++;
        var ok = b.dataset.ok === '1';
        if (ok) right++;
        q.querySelectorAll('.opts button').forEach(function (x) {
          x.classList.toggle('pick', x === b);
          x.classList.toggle('right', x === b && ok);
          x.classList.toggle('wrong', x === b && !ok);
          x.disabled = true;
        });
        why.classList.add('show');
        var s = box.querySelector('.score');
        s.textContent = 'Отвечено ' + done + ' из ' + qs.length +
          ' · верно ' + right + (done === qs.length
            ? (right >= 3 ? '. Разница между видом и числом вариантов вам уже видна.'
                          : '. Посчитайте свой пароль на следующей странице — разница '
                            + 'станет видна в цифрах.')
            : '');
      });
    });
  });
})();

// ——— И2: секундомер взлома (главный инструмент, страница «Проверить пароль»)
(function () {
  var box = document.querySelector('[data-tool="И2"]');
  if (!box) return;
  var input = box.querySelector('#pwd');
  var out = box.querySelector('.result');
  var H = 220e9;                       // вариантов в секунду (см. §4 брифа)
  var YEAR = 365.25 * 24 * 3600;
  // Признаки предсказуемости распознаются, а не подбираются: список нужен, чтобы
  // ПОКАЗАТЬ посетителю, что его комбинация уже входит в готовый список, а не для
  // того, чтобы что-либо подбирать. Ни одного реального пароля и ни одной базы
  // утечек здесь нет — только общеизвестный класс слабых основ (§10 брифа).
  var WEAK = ['password', 'qwerty', 'admin', 'love', 'sun', 'secret', 'master',
    'dragon', 'monkey', 'football', 'iloveyou', 'sunshine', 'princess', 'superman',
    'welcome', 'hello', 'summer', 'winter', 'dima', 'ivan', 'anna', 'olga', 'sasha',
    'maxim', 'elena', 'dasha', 'nikita', 'artem', 'sergey', 'andrey', 'max', 'kate',
    'alex', 'nastya', 'katya', 'vera', 'oleg', 'denis'];
  var KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];

  function ru(s) { return s.replace('.', ','); }

  function classesOf(s) {
    var digit = false, lower = false, upper = false, cyr = false, punct = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i), code = s.charCodeAt(i);
      if (ch >= '0' && ch <= '9') digit = true;
      else if (ch >= 'a' && ch <= 'z') lower = true;
      else if (ch >= 'A' && ch <= 'Z') upper = true;
      else if (/[а-яёА-ЯЁ]/.test(ch)) cyr = true;
      else if (code >= 32 && code <= 126) punct = true;
      // символ вне этих пяти классов (редкий юникод) не добавляет свой алфавит,
      // но и не роняет расчёт: остальные встреченные классы считаются как есть
    }
    var n = (digit ? 10 : 0) + (lower ? 26 : 0) + (upper ? 26 : 0) +
            (cyr ? 33 : 0) + (punct ? 33 : 0);
    return n || 1;                     // страховка от N=0 при нераспознанных символах
  }

  // ⛔ Число вариантов растёт быстрее, чем умеет double: 200 знаков смешанного
  // набора дают степень за пределами диапазона (Infinity при прямом Math.pow).
  // Поэтому весь расчёт ведётся в логарифмах по основанию 10 и не переполняется
  // ни при каком L — ровно требование «не NaN, не Infinity» из §9 конституции.
  function calc(pass) {
    var L = pass.length;
    var N = classesOf(pass);
    var logC = L * (Math.log(N) / Math.LN10);
    var logT = logC - Math.log(H) / Math.LN10;
    return { N: N, L: L, logC: logC, logT: logT };
  }

  function fmtMant(log10x) {
    var exp = Math.floor(log10x);
    var mant = Math.pow(10, log10x - exp);
    if (mant >= 9.995) { mant = 1; exp += 1; }
    return { mant: mant, exp: exp };
  }

  function fmtCount(logC) {
    if (logC < 6) {
      return Math.max(1, Math.round(Math.pow(10, logC))).toLocaleString('ru-RU');
    }
    var f = fmtMant(logC);
    return ru(f.mant.toFixed(2)) + ' × 10^' + f.exp;
  }

  function fmtTime(logT) {
    var LOG_YEAR = Math.log10(YEAR);
    if (logT < LOG_YEAR) {
      // до года — считаем напрямую в секундах/минутах/часах/сутках,
      // переполнения здесь не бывает
      var T = Math.pow(10, logT);
      if (T < 60) return ru(T.toFixed(2)) + ' сек.';
      if (T < 3600) return ru((T / 60).toFixed(2)) + ' мин.';
      if (T < 86400) return ru((T / 3600).toFixed(2)) + ' ч.';
      return ru((T / 86400).toFixed(2)) + ' сут.';
    }
    var logYears = logT - LOG_YEAR;
    if (logYears < 6) {
      return Math.round(Math.pow(10, logYears)).toLocaleString('ru-RU') + ' лет';
    }
    if (logYears < 9) {
      return ru((Math.pow(10, logYears - 6)).toFixed(2)) + ' млн лет';
    }
    if (logYears < 12) {
      return ru((Math.pow(10, logYears - 9)).toFixed(2)) + ' млрд лет';
    }
    var f = fmtMant(logYears);
    return ru(f.mant.toFixed(2)) + ' × 10^' + f.exp + ' лет';
  }

  function predictable(pass) {
    var low = pass.toLowerCase();
    var norm = low.replace(/@/g, 'a').replace(/0/g, 'o').replace(/1/g, 'i')
                  .replace(/3/g, 'e').replace(/\$/g, 's');
    for (var i = 0; i < WEAK.length; i++) {
      if (low.indexOf(WEAK[i]) >= 0 || norm.indexOf(WEAK[i]) >= 0) {
        return 'в наборе есть словарная основа или имя';
      }
    }
    var year = pass.match(/(19[5-9]\d|20[0-3]\d)/);
    if (year) return 'в наборе есть дата вида года («' + year[0] + '»)';
    for (var r = 0; r < KEY_ROWS.length; r++) {
      var row = KEY_ROWS[r];
      for (var j = 0; j + 4 <= row.length; j++) {
        var seg = row.slice(j, j + 4);
        if (low.indexOf(seg) >= 0) return 'в наборе есть ряд соседних клавиш («' + seg + '»)';
      }
    }
    if (/(.)\1{2,}/.test(pass)) return 'в наборе трижды и больше повторён один знак';
    return null;
  }

  function render() {
    var v = input.value;
    if (!v) {
      out.innerHTML = '<p class="dim">Наберите комбинацию, похожую на вашу, — расчёт ' +
        'появится здесь же, без нажатия кнопки.</p>';
      return;
    }
    var r = calc(v);
    var levelClass = r.logT < Math.log10(3600 * 24 * 30) ? 'bad' :
                      r.logT < Math.log10(365.25 * 24 * 3600 * 100) ? 'mid' : 'ok';
    var flag = predictable(v);
    var html = '' +
      '<div class="grid2">' +
        '<div class="box"><p class="lbl">Символов набора · N</p>' +
        '<p class="val">' + r.N + '</p></div>' +
        '<div class="box"><p class="lbl">Длина · L</p>' +
        '<p class="val">' + r.L + '</p></div>' +
        '<div class="box"><p class="lbl">Число вариантов · C = N^L</p>' +
        '<p class="val">' + fmtCount(r.logC) + '</p></div>' +
        '<div class="box"><p class="lbl">Время полного перебора</p>' +
        '<p class="val ' + levelClass + '">' + fmtTime(r.logT) + '</p></div>' +
      '</div>';
    if (flag) {
      html += '<div class="flag">Вторая оценка: ' + flag + ' — такой пароль (или его ' +
        'основа) перебирают не сплошь, а по готовому списку вероятных комбинаций, и ' +
        'подбор занимает секунды, а не годы. Расчёт полного перебора выше к нему ' +
        'неприменим (Т. М. Татарникова, 2025).</div>';
    } else {
      html += '<div class="safe">Признаков предсказуемости не найдено: слова, даты, ' +
        'ряда соседних клавиш и повтора знака в наборе нет — расчёт выше и есть честная ' +
        'оценка стойкости.</div>';
    }
    out.innerHTML = html;
  }

  input.addEventListener('input', render);
  render();
})();

// ——— И6: чек-лист входа (страница «Что делать»)
(function () {
  var box = document.querySelector('[data-tool="И6"]');
  if (!box) return;
  var boxes = box.querySelectorAll('input[type=checkbox]');
  var out = box.querySelector('.cnt');
  function draw() {
    var n = 0;
    boxes.forEach(function (c) { if (c.checked) n++; });
    out.textContent = 'Отмечено ' + n + ' из ' + boxes.length +
      (n === boxes.length ? ' — порядок входа настроен' : '');
    out.classList.toggle('done', n === boxes.length);
  }
  boxes.forEach(function (c) { c.addEventListener('change', draw); });
  draw();
})();

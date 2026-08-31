
(function(){
  const b=document.body;
  const base=b.dataset.base||"../";
  const active=b.dataset.active||"";
  const p=(s)=>base+s;

  const groups=[
    {id:"education",name:"교육원소개",href:"교육원소개/about.html",items:[
      ["교육원 소개","교육원소개/about.html"],["원장 인사말","교육원소개/greeting.html"],
      ["조직도","교육원소개/organization.html"],["연혁","교육원소개/history.html"],
      ["시설 안내","교육원소개/facilities.html"],["오시는 길","교육원소개/contact.html"]
    ]},
    {id:"card",name:"국민내일배움카드",href:"국민내일배움카드/card.html",items:[
      ["국민내일배움카드 안내","국민내일배움카드/card.html"],["지원대상","국민내일배움카드/target.html"],
      ["카드 발급방법","국민내일배움카드/issue.html"],["훈련과정 안내","국민내일배움카드/courses.html"],
      ["수강신청 방법","국민내일배움카드/apply.html"],["자주 묻는 질문","국민내일배움카드/faq.html"]
    ]},
    {id:"voucher",name:"평생교육이용권",href:"평생교육이용권/voucher.html",items:[
      ["평생교육이용권 안내","평생교육이용권/voucher.html"],["신청대상","평생교육이용권/target.html"],
      ["신청방법","평생교육이용권/apply.html"],["이용방법","평생교육이용권/use.html"],
      ["수강가능 과정","평생교육이용권/courses.html"],["자주 묻는 질문","평생교육이용권/faq.html"]
    ]},
    {id:"notice",name:"공지사항",href:"공지사항/notice.html",items:[
      ["전체 공지","공지사항/notice.html"],["개강 안내","공지사항/open.html"],
      ["모집중인 과정","공지사항/recruit.html"],["교육 일정","공지사항/schedule.html"],
      ["자료실","공지사항/data.html"]
    ]},
    {id:"community",name:"커뮤니티",href:"커뮤니티/community.html",items:[
      ["수강생 후기","커뮤니티/review.html"],["수강생 작품","커뮤니티/work.html"],
      ["취업 · 창업 이야기","커뮤니티/job.html"],["포토갤러리","커뮤니티/gallery.html"],
      ["질문과 답변","커뮤니티/qna.html"],["건의함","커뮤니티/suggestion.html"]
    ]},
    {id:"location",name:"오시는길",href:"교육원소개/contact.html",items:[
      ["위치 안내","교육원소개/contact.html"],["대중교통 안내","교육원소개/contact.html#transport"],
      ["주차 안내","교육원소개/contact.html#parking"]
    ]},
    {id:"consult",name:"수강상담",href:"수강상담/consult.html",button:true,items:[
      ["온라인 수강상담","수강상담/consult.html"],["나에게 맞는 과정 찾기","수강상담/course.html"],
      ["전화상담 안내","수강상담/phone.html"],["방문상담 안내","수강상담/visit.html"]
    ]}
  ];

  const dropdown=(g)=>g.items.map(([n,h])=>`<a href="${p(h)}">${n}</a>`).join("");
  const nav=groups.map(g=>`
    <li class="nav-item ${active===g.id?"active":""}">
      <a href="${p(g.href)}" class="${g.button?"consult-btn":""}">${g.name}</a>
      <div class="dropdown">${dropdown(g)}</div>
    </li>`).join("");

  const mobile=groups.map(g=>`
    <a href="${p(g.href)}">${g.name}</a>
    <div class="mobile-sub">${g.items.map(([n,h])=>`<a href="${p(h)}">└ ${n}</a>`).join("")}</div>`).join("");

  const header=`
    <div class="top-bar"></div>
    <header>
      <div class="header-inner">
        <a href="${p("index.html")}" class="logo">
          <img src="${p("images/log.png")}" alt="센텀디지털캠프 평생교육원"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
          <span class="logo-fallback"><b>C</b>센텀디지털캠프</span>
        </a>
        <nav class="main-nav"><ul class="nav-menu">${nav}</ul></nav>
        <button class="mobile-menu-button" type="button" aria-label="메뉴 열기" onclick="toggleMenu()">☰</button>
      </div>
      <div class="mobile-nav" id="mobileNav">${mobile}</div>
    </header>`;

  const footer=`
    <footer>
      <div class="footer-inner">
        <div class="footer-name">센텀디지털캠프 평생교육원</div>
        <div class="footer-links">
          <a href="${p("교육원소개/about.html")}">교육원소개</a>
          <a href="${p("국민내일배움카드/card.html")}">국민내일배움카드</a>
          <a href="${p("평생교육이용권/voucher.html")}">평생교육이용권</a>
          <a href="${p("공지사항/notice.html")}">공지사항</a>
          <a href="${p("커뮤니티/community.html")}">커뮤니티</a>
          <a href="${p("커뮤니티/suggestion.html")}">건의함</a>
          <a href="${p("교육원소개/contact.html")}">오시는길</a>
          <a href="${p("수강상담/consult.html")}">수강상담</a>
        </div>
        <div class="footer-info">
          운영 : 주식회사 은누리디지털문화원<br>
          부설기관 : 센텀디지털캠프 평생교육원<br>
          교육 및 수강문의 : 051-710-0775<br>
          소재지 : 부산광역시 해운대구 센텀2로 20 센텀타워메디컬 1302호
        </div>
        <div class="copyright">Copyright © 2026 Centum Digital Camp. All Rights Reserved.</div>
      </div>
    </footer>`;

  const h=document.getElementById("siteHeader");
  const f=document.getElementById("siteFooter");
  if(h)h.innerHTML=header;
  if(f)f.innerHTML=footer;

  window.toggleMenu=function(){
    const m=document.getElementById("mobileNav");
    if(m)m.classList.toggle("active");
  };
  document.addEventListener("click",function(e){
    if(e.target.classList.contains("faq-question")){
      e.target.closest(".faq-item").classList.toggle("open");
    }
  });
})();

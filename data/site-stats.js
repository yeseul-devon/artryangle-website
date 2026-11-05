/**
 * 아트라이앵글 홈페이지 수치 — 이 파일만 고치면 됩니다.
 *
 * 아래 숫자는 모두 검증 전 플레이스홀더입니다. 확인한 값으로 숫자만 바꾸세요.
 * 문장과 디자인은 그대로 두고, 연결된 자리의 숫자만 같이 바뀝니다.
 * (히어로, 철학 섹션, About 배지, datarts, 프로젝트 카드, About 페이지)
 *
 * JS가 없는 화면(검색 로봇, 링크 미리보기)에도 같은 숫자가 보이게 하려면
 * 수정한 뒤 한 번 실행하세요.
 *   node scripts/apply-site-stats.js
 *
 * 실행을 깜빡해도, 스크립트가 켜진 브라우저에서는 이 파일 값이 바로 반영됩니다.
 *
 * value     : 세는 숫자. 카운터와 문장 속 숫자에 씁니다.
 * suffix    : 카운터 뒤에만 붙는 기호(+). 문장에는 붙지 않습니다.
 * text/unit : 세지 않고 그대로 보여주는 표기. 예) 2028 + H2
 * labelHtml : 숫자 아래 설명. 줄바꿈은 <br>만 사용합니다.
 */
(function (root) {
  root.SITE_STATS = {
    projects: {
      value: 50,
      suffix: '+',
      label: '기획 프로젝트'
    },
    years: {
      value: 10,
      suffix: '+',
      label: '년 현장 경력'
    },
    participants: {
      value: 200,
      suffix: '+',
      label: '강연·교육 참가자'
    },
    respondents: {
      value: 500,
      suffix: '+',
      label: '기획프로젝트 누적 만족도조사 응답자',
      labelHtml: '기획프로젝트 누적 만족도조사 응답자'
    },
    bep: {
      text: '2028',
      unit: 'H2',
      labelHtml: 'BEP 달성 목표<br>3개 레이어 통합 기준',
      label: 'BEP 달성 목표'
    },
    dancerYears: {
      value: 15,
      suffix: '',
      label: '한국무용 전문 무용수 경력 (년)'
    },
    dispatchCountries: {
      value: 4,
      suffix: '',
      label: '세종학당 해외 파견 국가 수'
    },
    kwaveStreakYears: {
      value: 3,
      suffix: '',
      label: 'K-Wave Dance Festival 연속 개최 (년)'
    },
    serviceCount: {
      value: 4,
      suffix: '',
      label: '서비스 가지 수 (제목의 N가지. 카드 개수와는 별개)'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================
// デザイン診断スクリプト
// ブラウザのコンソールで実行してください
// ============================================

(function() {
  console.log('%c🔍 Commons デザイン診断開始', 'color: #00BCD4; font-size: 20px; font-weight: bold;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00BCD4;');
  
  const results = {
    page: {},
    css: {},
    theme: {},
    elements: {},
    computed: {}
  };
  
  // ============================================
  // 1. ページ情報
  // ============================================
  console.group('📄 ページ情報');
  results.page = {
    url: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
    title: document.title,
    readyState: document.readyState,
    charset: document.characterSet,
    doctype: document.doctype ? document.doctype.name : 'none'
  };
  console.table(results.page);
  console.groupEnd();
  
  // ============================================
  // 2. CSS ファイル読み込み状態
  // ============================================
  console.group('📦 CSS ファイル読み込み状態');
  const stylesheets = Array.from(document.styleSheets);
  results.css.total = stylesheets.length;
  results.css.files = [];
  
  stylesheets.forEach((sheet, index) => {
    let rulesCount = 'blocked';
    try {
      rulesCount = sheet.cssRules ? sheet.cssRules.length : 'N/A';
    } catch (e) {
      // CORS制限でアクセスできない外部CSS（Tailwind CDNなど）
      rulesCount = 'CORS blocked (external)';
    }
    
    const info = {
      index,
      href: sheet.href || 'inline',
      disabled: sheet.disabled,
      rules: rulesCount,
      media: sheet.media.mediaText || 'all'
    };
    results.css.files.push(info);
    
    const status = sheet.href && !sheet.disabled ? '✅' : '❌';
    console.log(`${status} [${index}] ${info.href} (${info.rules} rules)`);
  });
  
  // 重要なCSSファイルの存在確認
  const criticalCSS = [
    '/static/commons-theme.css',
    '/static/commons-components.css',
    'tailwindcss'
  ];
  
  console.log('\n🎯 重要CSSファイルチェック:');
  criticalCSS.forEach(css => {
    const found = stylesheets.some(sheet => 
      sheet.href && (sheet.href.includes(css) || sheet.href === css)
    );
    console.log(`${found ? '✅' : '❌'} ${css}`);
    results.css[css] = found;
    
    // 実際に見つかったファイルのパスも表示
    if (!found && css.startsWith('/static/')) {
      console.log(`   💡 ヒント: HTMLに以下を追加してください:`);
      console.log(`   <link href="${css}" rel="stylesheet">`);
    }
  });
  
  // 実際に読み込まれているCSSファイルのリストを表示
  console.log('\n📄 実際に読み込まれているCSSファイル:');
  const loadedCSS = stylesheets
    .filter(sheet => sheet.href)
    .map(sheet => sheet.href);
  
  if (loadedCSS.length === 0) {
    console.warn('⚠️ 外部CSSファイルが1つも読み込まれていません！');
  } else {
    loadedCSS.forEach((href, index) => {
      console.log(`${index + 1}. ${href}`);
    });
  }
  
  console.groupEnd();
  
  // ============================================
  // 3. テーマ設定確認
  // ============================================
  console.group('🎨 テーマ設定確認');
  const html = document.documentElement;
  const body = document.body;
  
  results.theme = {
    htmlDataTheme: html.getAttribute('data-theme'),
    bodyDataTheme: body.getAttribute('data-theme'),
    htmlClass: html.className,
    bodyClass: body.className,
    lang: html.lang
  };
  
  console.table(results.theme);
  
  if (results.theme.htmlDataTheme !== 'light') {
    console.warn('⚠️ data-theme が "light" ではありません:', results.theme.htmlDataTheme);
  } else {
    console.log('✅ data-theme="light" が正しく設定されています');
  }
  console.groupEnd();
  
  // ============================================
  // 4. CSS変数（カスタムプロパティ）確認
  // ============================================
  console.group('🎨 CSS変数（カラーパレット）確認');
  const rootStyle = getComputedStyle(document.documentElement);
  
  const cssVars = [
    '--commons-primary',
    '--commons-primary-dark',
    '--commons-accent-yellow',
    '--commons-bg-purple',
    '--commons-text-primary',
    '--commons-bg-white',
    '--font-size-hero',
    '--spacing-unit'
  ];
  
  results.computed.cssVars = {};
  cssVars.forEach(varName => {
    const value = rootStyle.getPropertyValue(varName).trim();
    results.computed.cssVars[varName] = value || 'NOT FOUND';
    const status = value ? '✅' : '❌';
    console.log(`${status} ${varName}: ${value || '未定義'}`);
  });
  
  if (!results.computed.cssVars['--commons-primary']) {
    console.error('❌ Vivoo風CSS変数が読み込まれていません！');
    console.log('💡 commons-theme.css が正しく読み込まれているか確認してください');
  }
  console.groupEnd();
  
  // ============================================
  // 5. 主要要素の存在確認
  // ============================================
  console.group('🔍 主要要素の存在確認');
  
  // HTMLのlink要素を確認
  console.log('📌 HTMLの<link>要素:');
  const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
  if (linkElements.length === 0) {
    console.warn('⚠️ <link rel="stylesheet"> 要素が見つかりません！');
  } else {
    linkElements.forEach((link, index) => {
      console.log(`${index + 1}. href="${link.href}"`);
      console.log(`   ↳ media="${link.media || 'all'}"`);
      console.log(`   ↳ disabled=${link.disabled}`);
    });
  }
  
  console.log('\n📌 HTMLの主要要素:');
  const selectors = [
    'header',
    'nav',
    'main',
    'footer',
    '.auth-container',
    '.auth-card',
    '.btn-primary',
    '.card',
    '.hero'
  ];
  
  results.elements.found = {};
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    results.elements.found[selector] = elements.length;
    const status = elements.length > 0 ? '✅' : '⚠️';
    console.log(`${status} ${selector}: ${elements.length}個`);
  });
  console.groupEnd();
  
  // ============================================
  // 6. 計算済みスタイル確認（サンプル要素）
  // ============================================
  console.group('💅 計算済みスタイル確認');
  
  // body要素のスタイル
  const bodyStyles = getComputedStyle(body);
  results.computed.body = {
    backgroundColor: bodyStyles.backgroundColor,
    color: bodyStyles.color,
    fontFamily: bodyStyles.fontFamily,
    fontSize: bodyStyles.fontSize
  };
  console.log('📌 Body スタイル:');
  console.table(results.computed.body);
  
  // プライマリボタンがあれば確認
  const primaryBtn = document.querySelector('.btn-primary');
  if (primaryBtn) {
    const btnStyles = getComputedStyle(primaryBtn);
    results.computed.primaryBtn = {
      backgroundColor: btnStyles.backgroundColor,
      color: btnStyles.color,
      borderRadius: btnStyles.borderRadius,
      padding: btnStyles.padding
    };
    console.log('📌 プライマリボタン スタイル:');
    console.table(results.computed.primaryBtn);
  } else {
    console.log('⚠️ .btn-primary 要素が見つかりません');
  }
  console.groupEnd();
  
  // ============================================
  // 7. ネットワークリソース確認
  // ============================================
  console.group('🌐 ネットワークリソース確認');
  if (window.performance && window.performance.getEntriesByType) {
    const resources = performance.getEntriesByType('resource');
    const cssResources = resources.filter(r => 
      r.name.includes('.css') || r.initiatorType === 'css' || r.initiatorType === 'link'
    );
    
    console.log(`📊 総リソース数: ${resources.length}`);
    console.log(`📊 CSS リソース数: ${cssResources.length}`);
    
    console.log('\n🔗 CSS リソース詳細:');
    cssResources.forEach(resource => {
      // responseStatus は一部のブラウザでは使えないため、存在チェック
      const status = resource.responseStatus || (resource.transferSize > 0 ? 200 : 'unknown');
      const statusIcon = status === 200 ? '✅' : status === 'unknown' ? '⚠️' : '❌';
      
      console.log(`${statusIcon} ${resource.name}`);
      console.log(`   ↳ サイズ: ${(resource.transferSize / 1024).toFixed(2)} KB`);
      console.log(`   ↳ 読込時間: ${resource.duration.toFixed(2)} ms`);
      console.log(`   ↳ ステータス: ${status}`);
    });
    
    results.network = {
      totalResources: resources.length,
      cssResources: cssResources.length,
      cssFiles: cssResources.map(r => ({
        url: r.name,
        size: r.transferSize,
        duration: r.duration,
        status: r.responseStatus || (r.transferSize > 0 ? 200 : 'unknown')
      }))
    };
  } else {
    console.log('⚠️ Performance API が利用できません');
  }
  console.groupEnd();
  
  // ============================================
  // 8. エラー診断
  // ============================================
  console.group('🚨 問題診断');
  const issues = [];
  
  // CSS変数チェック
  if (!results.computed.cssVars['--commons-primary']) {
    issues.push({
      severity: 'CRITICAL',
      category: 'CSS',
      message: 'Vivoo風CSS変数が読み込まれていません',
      solution: 'commons-theme.css が正しく読み込まれているか確認してください'
    });
  }
  
  // data-theme チェック
  if (results.theme.htmlDataTheme !== 'light') {
    issues.push({
      severity: 'ERROR',
      category: 'Theme',
      message: `data-theme が "light" ではありません: ${results.theme.htmlDataTheme}`,
      solution: 'HTML要素に data-theme="light" を設定してください'
    });
  }
  
  // CSS読み込みチェック
  if (!results.css['/static/commons-theme.css']) {
    issues.push({
      severity: 'CRITICAL',
      category: 'CSS',
      message: 'commons-theme.css が読み込まれていません',
      solution: '<link href="/static/commons-theme.css" rel="stylesheet"> を追加してください'
    });
  }
  
  if (!results.css['/static/commons-components.css']) {
    issues.push({
      severity: 'WARNING',
      category: 'CSS',
      message: 'commons-components.css が読み込まれていません',
      solution: '<link href="/static/commons-components.css" rel="stylesheet"> を追加してください'
    });
  }
  
  if (issues.length === 0) {
    console.log('✅ 問題は検出されませんでした');
  } else {
    console.table(issues);
    
    console.log('\n📋 修正手順:');
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.severity}] ${issue.message}`);
      console.log(`   💡 解決方法: ${issue.solution}`);
    });
  }
  console.groupEnd();
  
  // ============================================
  // 9. 診断結果サマリー
  // ============================================
  console.log('\n');
  console.log('%c📊 診断結果サマリー', 'color: #00BCD4; font-size: 18px; font-weight: bold;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00BCD4;');
  
  const summary = {
    'ページURL': results.page.url,
    'CSSファイル数': results.css.total,
    'commons-theme.css': results.css['/static/commons-theme.css'] ? '✅ 読込済' : '❌ 未読込',
    'commons-components.css': results.css['/static/commons-components.css'] ? '✅ 読込済' : '❌ 未読込',
    'Tailwind CSS': results.css['tailwindcss'] ? '✅ 読込済' : '❌ 未読込',
    'data-theme': results.theme.htmlDataTheme || '未設定',
    'CSS変数': results.computed.cssVars['--commons-primary'] ? '✅ 有効' : '❌ 無効',
    '検出された問題': issues.length
  };
  
  console.table(summary);
  
  if (issues.length > 0) {
    console.log(`\n⚠️ ${issues.length}件の問題が検出されました。上記の「問題診断」セクションを確認してください。`);
  } else {
    console.log('\n✅ デザインシステムは正常に機能しています！');
  }
  
  // ============================================
  // 10. グローバル変数に結果を保存
  // ============================================
  window.commonsDebug = results;
  console.log('\n💾 詳細な診断結果は window.commonsDebug に保存されました');
  console.log('   使用例: console.log(window.commonsDebug.css)');
  
  console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00BCD4;');
  console.log('%c🔍 診断完了', 'color: #00BCD4; font-size: 20px; font-weight: bold;');
  
  return results;
})();

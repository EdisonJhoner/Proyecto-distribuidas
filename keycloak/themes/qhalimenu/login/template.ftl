<#import "field.ftl" as field>

<#-- Marca de QhaliMenu (misma que el frontend Angular). -->
<#macro qmMark>
<span class="qm-mark" aria-hidden="true">
  <svg viewBox="0 0 48 48" fill="none">
    <path d="M7 21h34c0 10.5-7.4 18-17 18S7 31.5 7 21Z" fill="currentColor" opacity=".16"/>
    <path d="M7 21h34c0 10.5-7.4 18-17 18S7 31.5 7 21Z" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M14 29c2.6 4.2 6 6.3 10 6.3s7.4-2.1 10-6.3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
    <path d="M24 18c-1.2-6.4 2.6-10.6 9.4-11.4.6 6.9-3.2 11.3-9.4 11.4Z" fill="var(--qm-lime, #b9d48a)" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M24 18c-3.9-.6-6.6-2.6-8.2-5.9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  </svg>
</span>
</#macro>

<#macro username>
  <#assign label>
    <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
  </#assign>
  <@field.group name="username" label=label>
    <div class="${properties.kcInputGroup}">
      <div class="${properties.kcInputGroupItemClass} ${properties.kcFill}">
        <span class="${properties.kcInputClass} ${properties.kcFormReadOnlyClass}">
          <input id="kc-attempted-username" value="${auth.attemptedUsername}" readonly>
        </span>
      </div>
      <div class="${properties.kcInputGroupItemClass}">
        <button id="reset-login" class="${properties.kcFormPasswordVisibilityButtonClass} kc-login-tooltip" type="button"
              aria-label="${msg('restartLoginTooltip')}" onclick="location.href='${url.loginRestartFlowUrl}'">
            <i class="fa-sync-alt fas" aria-hidden="true"></i>
            <span class="kc-tooltip-text">${msg("restartLoginTooltip")}</span>
        </button>
      </div>
    </div>
  </@field.group>
</#macro>

<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}"<#if realm.internationalizationEnabled> lang="${locale.currentLanguageTag}" dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">
    <meta name="theme-color" content="#103a2a">

    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" type="image/svg+xml" href="${url.resourcesPath}/img/logo.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    <script type="module">
        import { startSessionPolling } from "${url.resourcesPath}/js/authChecker.js";

        startSessionPolling(
            "${url.ssoLoginInOtherTabsUrl?no_esc}"
        );
    </script>
</head>

<body id="keycloak-bg" class="${properties.kcBodyClass!} qm-body">

<div class="qm-page">
  <div class="qm-shell">

    <aside class="qm-aside">
      <a class="qm-brand" href="${properties.qmFrontendUrl}" aria-label="QhaliMenu, ir al inicio">
        <@qmMark/>
        <span class="qm-brand__text">
          <span class="qm-brand__name">Qhali<em>Menu</em></span>
          <span class="qm-brand__tag">Almuerzos saludables</span>
        </span>
      </a>

      <div class="qm-aside__content">
        <p class="qm-eyebrow">Acceso seguro</p>
        <h2 class="qm-aside__title">Bienvenido<br>de vuelta</h2>
        <p class="qm-aside__text">
          Ingresa con tu cuenta QhaliMenu para reservar tu menú, revisar tus pedidos
          y recoger con tu boleta digital.
        </p>
        <ul class="qm-points">
          <li>
            <span class="qm-points__num">1</span>
            <span><strong>Reserva</strong> tu menú del día en minutos.</span>
          </li>
          <li>
            <span class="qm-points__num">2</span>
            <span><strong>Paga</strong> con Mercado Pago o efectivo en caja.</span>
          </li>
          <li>
            <span class="qm-points__num">3</span>
            <span><strong>Recoge</strong> en caja mostrando tu código QR.</span>
          </li>
        </ul>
      </div>

      <div class="qm-aside__foot">
        <a class="qm-back" href="${properties.qmFrontendUrl}">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M11.5 4.5 6 10l5.5 5.5M6 10h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Volver a QhaliMenu
        </a>
        <span class="qm-aside__note">Proyecto académico · UPeU</span>
      </div>
    </aside>

    <main class="qm-card">
      <div class="qm-card__top">
        <a class="qm-card__brand" href="${properties.qmFrontendUrl}" aria-label="QhaliMenu, ir al inicio">
          <@qmMark/>
          <span>Qhali<em>Menu</em></span>
        </a>
        <span class="qm-secure">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="4.4" y="8.6" width="11.2" height="7.4" rx="2" stroke="currentColor" stroke-width="1.6"/>
            <path d="M7.2 8.6V6.8a2.8 2.8 0 0 1 5.6 0v1.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          Conexión segura
        </span>
      </div>

      <header class="qm-card__head">
        <h1 class="qm-card__title" id="kc-page-title"><#nested "header"></h1>
        <#assign qmSubtitle><#nested "subtitle"></#assign>
        <#if qmSubtitle?has_content>
          <p class="qm-card__subtitle">${qmSubtitle}</p>
        </#if>
      </header>

      <div class="qm-card__body">
        <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
            <#if displayRequiredFields>
                <div class="${properties.kcContentWrapperClass!}">
                    <div class="${properties.kcLabelWrapperClass!} subtitle">
                        <span class="${properties.kcInputHelperTextItemTextClass!}">
                          <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                        </span>
                    </div>
                </div>
            </#if>
        <#else>
            <#if displayRequiredFields>
                <div class="${properties.kcContentWrapperClass!}">
                    <div class="${properties.kcLabelWrapperClass!} subtitle">
                        <span class="${properties.kcInputHelperTextItemTextClass!}">
                          <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                        </span>
                    </div>
                    <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
                        <#nested "show-username">
                        <@username />
                    </div>
                </div>
            <#else>
                <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
                  <#nested "show-username">
                  <@username />
                </div>
            </#if>
        </#if>

        <#-- App-initiated actions should not see warning messages about the need to complete the action -->
        <#-- during login.                                                                               -->
        <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
            <div class="${properties.kcAlertClass!} pf-m-${(message.type = 'error')?then('danger', message.type)}">
                <div class="${properties.kcAlertIconClass!}">
                    <#if message.type = 'success'><span class="${properties.kcFeedbackSuccessIcon!}"></span></#if>
                    <#if message.type = 'warning'><span class="${properties.kcFeedbackWarningIcon!}"></span></#if>
                    <#if message.type = 'error'><span class="${properties.kcFeedbackErrorIcon!}"></span></#if>
                    <#if message.type = 'info'><span class="${properties.kcFeedbackInfoIcon!}"></span></#if>
                </div>
                <span class="${properties.kcAlertTitleClass!} kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
            </div>
        </#if>

        <#nested "form">

        <#if auth?has_content && auth.showTryAnotherWayLink()>
          <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post" novalidate="novalidate">
              <input type="hidden" name="tryAnotherWay" value="on"/>
              <a id="try-another-way" href="javascript:document.forms['kc-select-try-another-way-form'].requestSubmit()"
                  class="${properties.kcButtonSecondaryClass} ${properties.kcButtonBlockClass} ${properties.kcMarginTopClass}">
                    ${kcSanitize(msg("doTryAnotherWay"))?no_esc}
              </a>
          </form>
        </#if>

        <#if displayInfo>
          <div id="kc-info" class="${properties.kcSignUpClass!}">
              <div id="kc-info-wrapper" class="${properties.kcInfoAreaWrapperClass!}">
                  <#nested "info">
              </div>
          </div>
        </#if>

        <#nested "socialProviders">
      </div>

      <div class="qm-card__foot">
        <span>¿Necesitas ayuda para ingresar?</span>
        <a href="mailto:${properties.qmSupportEmail}">Contacta a soporte</a>
      </div>
    </main>

  </div>

  <p class="qm-page__note">QhaliMenu · Comedor universitario saludable</p>
</div>

</body>
</html>
</#macro>

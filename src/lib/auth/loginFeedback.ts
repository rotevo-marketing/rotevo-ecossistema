/** Public feedback only: never echo provider bodies, credentials or personal data. */
export function loginFailureMessage(value:unknown):string{
 const error=value&&typeof value==="object"?value as {name?:unknown;code?:unknown;status?:unknown;message?:unknown}:{};
 if(error.code==="invalid_credentials"||error.name==="AuthInvalidCredentialsError"||
  (error.name==="AuthApiError"&&error.message==="Invalid login credentials"))
  return "E-mail ou senha inválidos. Confira o e-mail, o teclado e a senha preenchida pelo navegador.";
 if(error.status===429||error.code==="over_request_rate_limit")
  return "Muitas tentativas de acesso. Aguarde alguns minutos antes de tentar novamente.";
 if(typeof error.status==="number"&&error.status>=500)
  return "O serviço de acesso está temporariamente indisponível. Tente novamente em alguns minutos.";
 if(error.name==="AuthRetryableFetchError"||error.name==="TypeError"||error.status===0)
  return "Não foi possível conectar ao serviço de acesso. Confira a conexão e se o navegador permite o acesso ao site.";
 if(error.name==="SecurityError"||error.name==="QuotaExceededError"||error.name==="InvalidStateError")
  return "O navegador não conseguiu armazenar a sessão. Confira as permissões de armazenamento deste site ou tente outro navegador.";
 return "Não foi possível concluir o acesso. Tente novamente; se persistir, informe a mensagem ao estrategista.";
}

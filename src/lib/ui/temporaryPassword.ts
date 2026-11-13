/** New-account suggestion only. Never reads or changes existing credentials. */
export function temporaryPassword(){
 const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
 const bytes=crypto.getRandomValues(new Uint8Array(20));
 // Rejection sampling avoids the bias of reducing arbitrary bytes modulo length.
 let output="";
 while(output.length<20){crypto.getRandomValues(bytes);for(const byte of bytes){if(byte<256-256%alphabet.length)output+=alphabet[byte%alphabet.length];if(output.length===20)break;}}
 return output+"!7aA";
}

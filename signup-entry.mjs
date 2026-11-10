import {registrationLink} from './invitation-link.mjs';
const $=id=>document.getElementById(id);
function mode(register){
  $('loginForm').hidden=register;$('portalRegistrationForm').hidden=!register;
  $('portalLoginTab').setAttribute('aria-selected',String(!register));$('portalRegisterTab').setAttribute('aria-selected',String(register));
  $('portalRegistrationError').textContent='';
}
$('portalLoginTab').addEventListener('click',()=>mode(false));
$('portalRegisterTab').addEventListener('click',()=>mode(true));
$('portalRegistrationForm').addEventListener('submit',e=>{
  e.preventDefault();if(!e.currentTarget.reportValidity())return;
  try{location.assign(registrationLink($('portalInvitationLink').value.trim()));}
  catch(error){$('portalRegistrationError').textContent=error.message;}
});


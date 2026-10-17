import { configured, db } from './lib/api';

const signedOutPanel = document.querySelector<HTMLElement>('#signed-out-panel')!;
const signedInPanel = document.querySelector<HTMLElement>('#signed-in-panel')!;
const status = document.querySelector<HTMLElement>('#delete-status')!;
const accountEmail = document.querySelector<HTMLElement>('#account-email')!;
const googleButton = document.querySelector<HTMLButtonElement>('#google-signin')!;
const signInForm = document.querySelector<HTMLFormElement>('#signin-form')!;
const deleteForm = document.querySelector<HTMLFormElement>('#delete-form')!;
const deleteButton = document.querySelector<HTMLButtonElement>('#delete-button')!;
const signOutButton = document.querySelector<HTMLButtonElement>('#signout-button')!;

function showStatus(message: string, kind: 'success' | 'error' | 'info' = 'info') {
  status.textContent = message;
  status.dataset.kind = kind;
}

function showAccount(email: string | undefined) {
  signedOutPanel.hidden = Boolean(email);
  signedInPanel.hidden = !email;
  accountEmail.textContent = email || 'cuenta activa';
  if (email) showStatus('La sesión está activa. La cuenta aún no se ha eliminado.');
}

if (!configured || !db) {
  googleButton.disabled = true;
  signInForm.querySelectorAll('input,button').forEach(element => { (element as HTMLInputElement | HTMLButtonElement).disabled = true; });
  showStatus('El centro de eliminación está temporalmente desconectado. Vuelve a intentarlo más tarde o contacta al desarrollador desde Google Play.', 'error');
} else {
  const client = db;
  client.auth.onAuthStateChange((_event, session) => showAccount(session?.user.email));
  void client.auth.getSession().then(({ data, error }) => {
    if (error) showStatus('No se pudo comprobar la sesión. Actualiza la página e inténtalo de nuevo.', 'error');
    showAccount(data.session?.user.email);
  });

  googleButton.addEventListener('click', async () => {
    googleButton.disabled = true;
    showStatus('Abriendo el inicio de sesión de Google…');
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/delete-account.html`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      googleButton.disabled = false;
      showStatus('No se pudo iniciar sesión con Google. Comprueba la conexión o usa el acceso por correo.', 'error');
    }
  });

  signInForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(signInForm);
    const email = String(data.get('email') || '').trim().toLowerCase();
    const password = String(data.get('password') || '');
    const submit = signInForm.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    submit.disabled = true;
    showStatus('Verificando tu cuenta…');
    const { error } = await client.auth.signInWithPassword({ email, password });
    submit.disabled = false;
    if (error) showStatus('No pudimos iniciar sesión. Revisa el correo y la contraseña, o recupera el acceso desde la app.', 'error');
  });

  deleteForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(deleteForm);
    const confirmation = String(data.get('confirmation') || '').trim().toUpperCase();
    if (confirmation !== 'ELIMINAR' || data.get('acknowledge') !== 'on') {
      showStatus('Escribe ELIMINAR y marca la casilla para confirmar.', 'error');
      return;
    }
    deleteButton.disabled = true;
    showStatus('Eliminando la cuenta y sus datos…');
    const { data: result, error } = await client.functions.invoke('delete-account', {
      body: { confirmation },
    });
    if (error || result?.deleted !== true) {
      deleteButton.disabled = false;
      showStatus('No se pudo completar la eliminación. Inténtalo de nuevo más tarde o contacta al desarrollador desde el correo público de Google Play.', 'error');
      return;
    }
    await client.auth.signOut({ scope: 'local' });
    deleteForm.reset();
    signedInPanel.hidden = true;
    signedOutPanel.hidden = true;
    showStatus('Tu cuenta fue eliminada. Si había acuerdos confirmados, sus tickets quedaron archivados por seguridad; tus chats y reseñas se borraron. Las copias técnicas se depuran según el plazo limitado del proveedor.', 'success');
  });

  signOutButton.addEventListener('click', async () => {
    const { error } = await client.auth.signOut();
    if (error) showStatus('No se pudo cerrar sesión. Puedes cerrar esta página y volver a entrar más tarde.', 'error');
    else showStatus('Sesión cerrada. La cuenta sigue activa.', 'info');
  });
}

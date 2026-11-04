import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { Field, Notice, Ornament, Seo, Spinner } from '../components/ui';
import { Logo } from '../components/Header';
import Captcha from '../components/Captcha';

/** Only same-site paths: "/account" yes; "//evil.com" and "/\evil.com" (protocol-relative) no. */
const safeNext = (next) => (next && /^\/(?![/\\])/.test(next) ? next : null);

const COPY = {
  login: ['Welcome back', 'Sign in to view orders, saved addresses and your wishlist.'],
  register: ['Create an account', 'Save your details, track orders and keep a wishlist.'],
  forgot: ['Forgotten password', "Enter your email and we'll send a reset link."],
  reset: ['Choose a new password', 'Use at least 8 characters.'],
  verify: ['Verifying your email', ''],
};

export default function Auth({ mode }) {
  const { signIn, user } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [v, setV] = useState({});
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ busy: false, error: '', message: '' });
  const [captcha, setCaptcha] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const needsCaptcha = mode === 'register' || mode === 'forgot';
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }); };

  useEffect(() => { setV({}); setErrors({}); setState({ busy: false, error: '', message: '' }); }, [mode]);

  useEffect(() => {
    if (mode !== 'verify') return;
    const token = params.get('token');
    if (!token) { setState({ error: 'This verification link is incomplete.' }); return; }
    setState({ busy: true });
    api('/api/auth/verify-email', { method: 'POST', body: { token } })
      .then((r) => setState({ message: r.message }))
      .catch((e) => setState({ error: e.message }));
  }, [mode, params]);

  const go = (u) => navigate(next || (u.admin ? '/admin' : '/account'), { replace: true });

  const validate = () => {
    const e = {};
    if (mode !== 'reset' && !/^\S+@\S+\.\S+$/.test(v.email || '')) e.email = 'Please enter a valid email address.';
    if (mode === 'register' && !v.firstName?.trim()) e.firstName = 'Please enter your first name.';
    if (['login', 'register', 'reset'].includes(mode) && !v.password) e.password = 'Please enter your password.';
    if (['register', 'reset'].includes(mode) && v.password && v.password.length < 8) e.password = 'Use at least 8 characters.';
    if (['register', 'reset'].includes(mode) && v.password !== v.confirm) e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setState({ busy: true, error: '', message: '' });
    try {
      if (mode === 'login' || mode === 'register') {
        const body = mode === 'login' ? { email: v.email, password: v.password }
          : { firstName: v.firstName, lastName: v.lastName, email: v.email, password: v.password, phone: v.phone, captchaToken: captcha };
        const auth = await api(`/api/auth/${mode}`, { method: 'POST', body });
        await signIn(auth);
        go(auth.user);
      } else if (mode === 'forgot') {
        const r = await api('/api/auth/forgot-password', { method: 'POST', body: { email: v.email, captchaToken: captcha } });
        setState({ busy: false, message: r.message });
      } else if (mode === 'reset') {
        const r = await api('/api/auth/reset-password', { method: 'POST', body: { token: params.get('token'), password: v.password } });
        setState({ busy: false, message: r.message });
      }
    } catch (err) {
      setState({ busy: false, error: err.message, message: '' });
      if (err.fields) setErrors(err.fields);
    } finally {
      if (needsCaptcha) setCaptchaReset((n) => n + 1); // tokens are single-use
    }
  };

  const [title, text] = COPY[mode];

  return (
    <>
      <Seo title={title} noindex />
      <div className="min-h-screen bg-linen/60 flex flex-col items-center justify-center px-4 py-16">

        {/* Logo */}
        <Link to="/" className="mb-10"><Logo /></Link>

        {/* Card */}
        <div className="w-full max-w-[420px] bg-ivory border border-espresso/10 shadow-sm px-8 py-10 sm:px-10">

          {/* Header */}
          <div className="text-center mb-8">
            <Ornament className="mb-5" />
            <h1 className="display-md">{title}</h1>
            {text && <p className="mt-2 text-sm text-espresso-muted leading-relaxed">{text}</p>}
          </div>

          {user && mode === 'login' && <div className="mb-6"><Notice>You're signed in as {user.email}. <Link to="/account" className="underline">Go to your account</Link></Notice></div>}

          {mode === 'verify' ? (
            <div className="text-center space-y-4">
              {state.busy && <Spinner />}
              {state.message && <Notice tone="success">{state.message}</Notice>}
              {state.error && <Notice tone="error">{state.error}</Notice>}
              <Link to={user ? '/account' : '/login'} className="btn-dark w-full mt-4">{user ? 'Go to my account' : 'Sign in'}</Link>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-5">
              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="First name" error={errors.firstName}><input autoComplete="given-name" className="field" value={v.firstName || ''} onChange={set('firstName')} /></Field>
                  <Field label="Last name"><input autoComplete="family-name" className="field" value={v.lastName || ''} onChange={set('lastName')} /></Field>
                </div>
              )}
              {mode !== 'reset' && <Field label="Email" error={errors.email}><input type="email" autoComplete="email" className="field" value={v.email || ''} onChange={set('email')} /></Field>}
              {mode === 'register' && <Field label="Phone (optional)"><input type="tel" autoComplete="tel" className="field" value={v.phone || ''} onChange={set('phone')} /></Field>}
              {['login', 'register', 'reset'].includes(mode) && (
                <Field label={mode === 'reset' ? 'New password' : 'Password'} error={errors.password}>
                  <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="field" value={v.password || ''} onChange={set('password')} />
                </Field>
              )}
              {['register', 'reset'].includes(mode) && (
                <Field label="Confirm password" error={errors.confirm}><input type="password" autoComplete="new-password" className="field" value={v.confirm || ''} onChange={set('confirm')} /></Field>
              )}
              {mode === 'login' && (
                <div className="text-right -mt-1">
                  <Link to="/forgot-password" className="text-xs text-espresso-muted hover:text-espresso underline underline-offset-4 transition-colors">Forgotten password?</Link>
                </div>
              )}
              {needsCaptcha && <Captcha key={mode} onToken={setCaptcha} resetKey={captchaReset} />}
              {state.error && <Notice tone="error">{state.error}</Notice>}
              {state.message && <Notice tone="success">{state.message}</Notice>}
              {!(state.message && mode === 'reset') && (
                <button className="btn-dark w-full mt-2" disabled={state.busy}>
                  {state.busy ? <Spinner /> : { login: 'Sign in', register: 'Create account', forgot: 'Send reset link', reset: 'Update password' }[mode]}
                </button>
              )}
              {state.message && mode === 'reset' && <Link to="/login" className="btn-dark w-full">Sign in</Link>}
            </form>
          )}

          {/* Footer link */}
          <p className="mt-8 pt-6 border-t border-espresso/8 text-center text-sm text-espresso-muted">
            {mode === 'login' && <>New to LICHT? <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-espresso font-medium underline underline-offset-4 hover:text-gold-deep transition-colors">Create an account</Link></>}
            {mode === 'register' && <>Already have an account? <Link to="/login" className="text-espresso font-medium underline underline-offset-4 hover:text-gold-deep transition-colors">Sign in</Link></>}
            {(mode === 'forgot' || mode === 'reset') && <Link to="/login" className="text-espresso font-medium underline underline-offset-4 hover:text-gold-deep transition-colors">Back to sign in</Link>}
          </p>
        </div>
      </div>
    </>
  );
}

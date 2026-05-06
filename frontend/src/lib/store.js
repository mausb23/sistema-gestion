const SESSION_KEY = "gv_usuario";

export const store = {
  getUsuario() {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUsuario(u) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  },
  clearUsuario() {
    localStorage.removeItem(SESSION_KEY);
  },
};

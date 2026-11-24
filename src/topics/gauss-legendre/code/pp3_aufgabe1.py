"""PP3 Aufgabe 1 – Gauß-Legendre über das Eigenwertproblem (Prop. 3.24).

Läuft mit numpy und matplotlib:  python pp3_aufgabe1.py
Die Abschnitte folgen den acht Kapiteln der Seite.
"""
import numpy as np
import matplotlib.pyplot as plt
from numpy.polynomial import polynomial as P

# >>> orthogonal
def moment(k):
    """Exaktes Integral von x^k über [-1, 1]."""
    return 0.0 if k % 2 else 2.0 / (k + 1)


def skalarprodukt(p, q):
    """<p, q> = ∫ p(x) q(x) dx über [-1, 1]; p, q als Koeffizienten (x^0 zuerst)."""
    pq = P.polymul(p, q)
    return sum(c * moment(k) for k, c in enumerate(pq))


def gram_matrix(basis):
    """G_ij = <φ_i, φ_j>. Diagonal genau dann, wenn die Familie orthogonal ist."""
    return np.array([[skalarprodukt(a, b) for b in basis] for a in basis])
# <<< orthogonal


# >>> gram-schmidt
def gram_schmidt(n):
    """Monische Legendre-Polynome p_0 … p_n aus 1, x, x², …"""
    ps = []
    for k in range(n + 1):
        p = np.zeros(k + 1)
        p[k] = 1.0                                      # x^k
        for q in ps:                                    # Projektionen abziehen
            c = skalarprodukt(p, q) / skalarprodukt(q, q)
            p = P.polysub(p, c * q)
        ps.append(np.trim_zeros(p, 'b'))
    return ps
# <<< gram-schmidt


# >>> rekursion
def b(n):
    """b_n = <p_n, p_n> / <p_{n-1}, p_{n-1}> = n² / (4n² − 1);  a_n = 0 (Symmetrie)."""
    return n * n / (4.0 * n * n - 1.0)


def rekursion(n):
    """x p_k = p_{k+1} + b_k p_{k-1}  ⇒  p_{k+1} = x p_k − b_k p_{k-1}."""
    ps = [np.array([1.0]), np.array([0.0, 1.0])]
    for k in range(1, n):
        ps.append(P.polysub(P.polymulx(ps[k]), b(k) * ps[k - 1]))
    return ps[: n + 1]
# <<< rekursion


# >>> matrix
def matrix_T(N):
    """x·p(x) = T p(x) + p_N(x) e_N:  Einsen über, b_k unter der Diagonalen."""
    T = np.zeros((N, N))
    for k in range(N - 1):
        T[k, k + 1] = 1.0
        T[k + 1, k] = b(k + 1)
    return T
# <<< matrix


# >>> symmetrisch
def beta(k):
    """β_k = sqrt(b_k) = (4 − k⁻²)^(-1/2)  (Aufgabenblatt)."""
    return 1.0 / np.sqrt(4.0 - 1.0 / (k * k))


def matrix_J(N):
    """J = D T D⁻¹ ist symmetrisch tridiagonal mit β_1 … β_{N-1} neben der Diagonalen."""
    off = [beta(k) for k in range(1, N)]
    return np.diag(off, 1) + np.diag(off, -1)
# <<< symmetrisch


# >>> stuetzstellen
def gauss_formel(N):
    """(x̂, ŵ) auf [-1, 1]: x̂ = Eigenwerte von J_N, ŵ_i = 2 · (v_i)_1²."""
    if N == 1:
        return np.array([0.0]), np.array([2.0])
    x, V = np.linalg.eigh(matrix_J(N))                # aufsteigend sortiert
    w = 2.0 * V[0, :] ** 2                             # erste Komponente jedes Eigenvektors
    return x, w
# <<< stuetzstellen


# >>> quadratur
def transformiere(x_hat, w_hat, a, b):
    """Lemma 3.3: [-1, 1] → [a, b]."""
    m, h = (a + b) / 2.0, (b - a) / 2.0
    return m + h * x_hat, h * w_hat


def quadratur(y, w):
    """Q = Σ w_i y_i."""
    return float(np.dot(w, y))
# <<< quadratur


# >>> exaktheitsgrad
def exaktheitsgrad(x_hat, w_hat, tol, k_max=200):
    """Größtes m, sodass |Q(x^k) − ∫x^k| ≤ tol für alle k ≤ m."""
    for k in range(k_max + 1):
        if abs(quadratur(x_hat ** k, w_hat) - moment(k)) > tol:
            return k - 1
    return k_max


def main(tol=1e-13):
    formeln = {N: gauss_formel(N) for N in range(1, 41)}      # einmal vorab
    Ns = np.arange(1, 41)
    grad = [exaktheitsgrad(*formeln[N], tol) for N in Ns]
    kond = [np.sum(np.abs(formeln[N][1])) for N in Ns]

    print(" N  gemessen  2N-1   Σ|ŵ|")
    for N, m, s in zip(Ns, grad, kond):
        print(f"{N:2d}  {m:8d}  {2*N-1:4d}   {s:.15f}")

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4))
    ax1.plot(Ns, grad, 'o', label='gemessen')
    ax1.plot(Ns, 2 * Ns - 1, '-', label='Theorie 2N − 1')
    ax1.set(xlabel='N', ylabel='Exaktheitsgrad', title=f'tol = {tol:g}')
    ax1.legend()
    ax2.semilogy(Ns, np.abs(np.array(kond) - 2) + 1e-17, 'o')
    ax2.set(xlabel='N', ylabel='|Σ|ŵ| − 2|', title='Konditionszahl Σ|ŵ| (= 2, alle ŵ > 0)')
    fig.tight_layout()
    plt.show()


if __name__ == '__main__':
    main()
# <<< exaktheitsgrad

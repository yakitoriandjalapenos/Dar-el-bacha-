# Découpe d'un logo de la planche officielle : fond relié au bord rendu transparent (remplissage),
# bord adouci et couleurs décontaminées. Aucun redimensionnement, aucun redessin.
import sys
from collections import deque
from PIL import Image
src, box, out = sys.argv[1], tuple(map(int, sys.argv[2].split(','))), sys.argv[3]
T1, T2 = 14, 70  # distance au fond : < T1 = fond ; T1..T2 = bord adouci
im = Image.open(src).convert('RGB').crop(box); W, H = im.size; px = im.load()
border = [px[x, 0] for x in range(W)] + [px[x, H-1] for x in range(W)] + [px[0, y] for y in range(H)] + [px[W-1, y] for y in range(H)]
bg = tuple(sorted(c[i] for c in border)[len(border)//2] for i in range(3))
d = lambda c: ((c[0]-bg[0])**2 + (c[1]-bg[1])**2 + (c[2]-bg[2])**2) ** 0.5
mask = [[False]*W for _ in range(H)]; q = deque()
for x in range(W):
    for y in (0, H-1): q.append((x, y))
for y in range(H):
    for x in (0, W-1): q.append((x, y))
while q:
    x, y = q.popleft()
    if mask[y][x] or d(px[x, y]) >= T1: continue
    mask[y][x] = True
    for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
        if 0 <= nx < W and 0 <= ny < H and not mask[ny][nx]: q.append((nx, ny))
outim = Image.new('RGBA', (W, H)); o = outim.load()
near = lambda x, y: any(0 <= x+dx < W and 0 <= y+dy < H and mask[y+dy][x+dx] for dx in (-2,-1,0,1,2) for dy in (-2,-1,0,1,2))
for y in range(H):
    for x in range(W):
        c = px[x, y]
        if mask[y][x]: o[x, y] = (*c, 0); continue
        a = 1.0
        if near(x, y): a = max(0.0, min(1.0, (d(c) - T1) / (T2 - T1)))
        if a <= 0: o[x, y] = (*c, 0); continue
        f = tuple(max(0, min(255, round((c[i] - (1 - a) * bg[i]) / a))) for i in range(3))
        o[x, y] = (*f, round(a * 255))
bb = outim.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
pad = 2; bb = (max(0, bb[0]-pad), max(0, bb[1]-pad), min(W, bb[2]+pad), min(H, bb[3]+pad))
res = outim.crop(bb); res.save(out + '.png', optimize=True)
res.save(out + '.webp', quality=92, alpha_quality=100, method=6)
print(f'{out.split("/")[-1]} : fond {bg}, taille {res.size}')

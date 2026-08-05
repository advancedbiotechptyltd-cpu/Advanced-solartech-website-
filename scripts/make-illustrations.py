"""
Generates the interim illustration set in src/illustrations/.

Isometric rather than skewed rectangles: every panel is an explicit quad
computed from the roof plane's own edge vectors, so a panel physically cannot
overhang the roof it sits on. Sizes and colours come from the site's design
tokens, so the artwork belongs to the same system as the pages.
"""
import math, os

W, H = 640, 400
NAVY, NAVY_2 = "#0A2540", "#16395c"
GOLD, GOLD_2 = "#ffb020", "#e09400"
CREAM = "#fff4de"
SKY_1, SKY_2 = "#dceaf7", "#f6fafd"
WALL, WALL_D, WALL_S = "#ffffff", "#e3ebf3", "#f4f8fb"
PANEL, PANEL_L = "#123a5e", "#2ب"
PANEL, PANEL_L = "#12395c", "#1e5382"
GREEN = "#1f9d55"
GREY, GREY_D = "#cfdbe7", "#aebecf"
BRICK = "#e8dfd4"

def V(a, b):    return (b[0]-a[0], b[1]-a[1])
def add(a, *vs):
    x, y = a
    for v in vs: x += v[0]; y += v[1]
    return (x, y)
def mul(v, s):  return (v[0]*s, v[1]*s)
def pts(*p):    return " ".join(f"{x:.1f},{y:.1f}" for x, y in p)

def head(defs=""):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{SKY_1}"/><stop offset="1" stop-color="{SKY_2}"/></linearGradient>
<linearGradient id="pv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{PANEL_L}"/><stop offset="1" stop-color="{PANEL}"/></linearGradient>
{defs}</defs>
<rect width="{W}" height="{H}" fill="url(#sky)"/>'''

def sun(cx, cy, r=30):
    o = [f'<circle cx="{cx}" cy="{cy}" r="{r*1.75:.0f}" fill="{GOLD}" opacity=".12"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{GOLD}"/>']
    for i in range(8):
        a = math.radians(i*45 + 22.5)
        x1, y1 = cx+math.cos(a)*(r+11), cy+math.sin(a)*(r+11)
        x2, y2 = cx+math.cos(a)*(r+23), cy+math.sin(a)*(r+23)
        o.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{GOLD}" stroke-width="5" stroke-linecap="round" opacity=".6"/>')
    return "".join(o)

def pv_field(A, B, D, cols, rows, gap=0.045, glass=True):
    """Tile A->B (u) by A->D (v). Every quad is derived from the plane itself."""
    u, v = V(A, B), V(A, D)
    o = [f'<polygon points="{pts(A, add(A,u), add(A,u,v), add(A,v))}" fill="{NAVY}" opacity=".92"/>']
    for j in range(rows):
        for i in range(cols):
            fi0, fi1 = (i+gap)/cols, (i+1-gap)/cols
            fj0, fj1 = (j+gap)/rows, (j+1-gap)/rows
            p0 = add(A, mul(u, fi0), mul(v, fj0))
            p1 = add(A, mul(u, fi1), mul(v, fj0))
            p2 = add(A, mul(u, fi1), mul(v, fj1))
            p3 = add(A, mul(u, fi0), mul(v, fj1))
            o.append(f'<polygon points="{pts(p0,p1,p2,p3)}" fill="url(#pv)"/>')
            # cell lines, so each panel reads as a module not a blue tile
            for k in (1, 2):
                a = add(p0, mul(V(p0, p1), k/3)); b = add(p3, mul(V(p3, p2), k/3))
                o.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{SKY_1}" stroke-width="1" opacity=".22"/>')
    if glass:
        # one specular sweep across the whole field, clipped by the plane
        cid = f"c{abs(hash((A,B,D)))%99999}"
        o.insert(0, f'<clipPath id="{cid}"><polygon points="{pts(A, add(A,u), add(A,u,v), add(A,v))}"/></clipPath>')
        s0 = add(A, mul(u, .10)); s1 = add(A, mul(u, .34))
        s2 = add(s1, v); s3 = add(s0, v)
        o.append(f'<g clip-path="url(#{cid})"><polygon points="{pts(s0,s1,s2,s3)}" fill="#fff" opacity=".10"/>'
                 f'<polygon points="{pts(add(A,mul(u,.52)), add(A,mul(u,.62)), add(add(A,mul(u,.62)),v), add(add(A,mul(u,.52)),v))}" fill="#fff" opacity=".07"/></g>')
    o.append(f'<polygon points="{pts(A, add(A,u), add(A,u,v), add(A,v))}" fill="none" stroke="{NAVY}" stroke-width="2.5" stroke-linejoin="round" opacity=".8"/>')
    return "".join(o)

def iso_house(cx=320, apex=118, half=228, drop=82, wall=78, roof_fill=NAVY_2):
    """Isometric single-pitch house. Returns (svg, roof plane corners)."""
    A = (cx-half, apex+drop)          # left corner
    B = (cx,      apex)               # far corner
    C = (cx+half, apex+drop)          # right corner
    D = (cx,      apex+drop*2)        # near corner
    Ab, Db, Cb = (A[0], A[1]+wall), (D[0], D[1]+wall), (C[0], C[1]+wall)
    s = [
      f'<polygon points="{pts(A,D,Db,Ab)}" fill="{WALL_D}"/>',
      f'<polygon points="{pts(D,C,Cb,Db)}" fill="{WALL_S}"/>',
      f'<polygon points="{pts(A,B,C,D)}" fill="{roof_fill}"/>',
    ]
    return "".join(s), (A, B, C, D), (Ab, Db, Cb)

def shadow(cx, y, rx=210, ry=16):
    return f'<ellipse cx="{cx}" cy="{y}" rx="{rx}" ry="{ry}" fill="{GREY_D}" opacity=".28"/>'

def hills():
    return (f'<path d="M0 292 L118 246 L226 288 L352 232 L470 274 L640 220 L640 340 L0 340 Z" fill="{GREY}" opacity=".45"/>'
            f'<rect x="0" y="330" width="{W}" height="{H-330}" fill="#e9f0f6"/>')

OUT = "src/illustrations"
os.makedirs(OUT, exist_ok=True)
def write(name, body):
    open(f"{OUT}/{name}.svg", "w").write(head() + body + "</svg>\n")
    return name


def plane_rect(O, u, v, fx, fy, fw, fh, fill=CREAM, stroke=NAVY, sw=2, op=1.0, rx=None):
    """A rectangle living ON a plane, positioned in the plane's own fractions.
    Same trick as the panels: derived from the surface, so it cannot float off."""
    p0 = add(O, mul(u, fx),      mul(v, fy))
    p1 = add(O, mul(u, fx+fw),   mul(v, fy))
    p2 = add(O, mul(u, fx+fw),   mul(v, fy+fh))
    p3 = add(O, mul(u, fx),      mul(v, fy+fh))
    st = f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"' if stroke else ''
    return f'<polygon points="{pts(p0,p1,p2,p3)}" fill="{fill}"{st} opacity="{op}"/>'

def inset(A, B, C, D, m=0.08):
    u, v = V(A, B), V(A, D)
    return (add(A, mul(u, m), mul(v, m)),
            add(A, mul(u, 1-m), mul(v, m)),
            add(A, mul(u, m), mul(v, 1-m)))

def scene_house(cx=316, apex=120, half=222, drop=80, wall=84,
                cols=5, rows=3, sun_at=(534,76,32), inset_m=0.10,
                roof_fill=NAVY_2, extras="", windows=True):
    house, (A,B,C,D), (Ab,Db,Cb) = iso_house(cx, apex, half, drop, wall, roof_fill)
    pA,pB,pD = inset(A,B,C,D, inset_m)
    # Wall planes, in their own coordinates.
    Lo, Lu, Lv = A, V(A,D), V(A,Ab)          # left / shaded wall
    Ro, Ru, Rv = D, V(D,C), V(D,Db)          # right / lit wall
    s = [hills(), sun(*sun_at), shadow(cx, apex+drop*2+wall+18, half+16, 18), house]
    s.append(pv_field(pA, pB, pD, cols, rows))
    s.append(f'<polygon points="{pts(A,B,C,D)}" fill="none" stroke="{NAVY}" stroke-width="3" stroke-linejoin="round"/>')
    if windows:
        s.append(plane_rect(Lo, Lu, Lv, .12, .22, .22, .40, op=.9))
        s.append(plane_rect(Lo, Lu, Lv, .44, .22, .22, .40, op=.9))
        s.append(plane_rect(Lo, Lu, Lv, .74, .20, .18, .78, fill=NAVY_2, op=.9))   # door
        s.append(plane_rect(Ro, Ru, Rv, .18, .22, .20, .38, op=.62))
        s.append(plane_rect(Ro, Ru, Rv, .52, .22, .20, .38, op=.62))
    s.append(extras)
    return "".join(s), (Lo,Lu,Lv), (Ro,Ru,Rv), (Ab,Db,Cb)

# ── hero-install ─────────────────────────────────────────────────────────────
body, L, R, base = scene_house(
    extras=(f'<path d="M436 218 q42 48 56 76" stroke="{GOLD}" stroke-width="4" stroke-linecap="round" '
            f'fill="none" stroke-dasharray="8 10"/>'))
Ro, Ru, Rv = R
body += (plane_rect(Ro, Ru, Rv, .80, .34, .13, .40, fill=WALL, sw=2.5)
         + f'<circle cx="{add(Ro, mul(Ru,.865), mul(Rv,.48))[0]:.0f}" cy="{add(Ro, mul(Ru,.865), mul(Rv,.48))[1]:.0f}" r="5" fill="{GREEN}"/>')
write("hero-install", body)

# ── service-solar-panels ─────────────────────────────────────────────────────
body, *_ = scene_house(cx=320, apex=112, half=238, drop=86, wall=78,
                       cols=6, rows=4, sun_at=(556,70,26), inset_m=0.07)
write("service-solar-panels", body)

# ── service-commercial-solar ─────────────────────────────────────────────────
house, (A,B,C,D), (Ab,Db,Cb) = iso_house(320, 138, 292, 58, 66, "#22456a")
pA,pB,pD = inset(A,B,C,D, 0.04)
Lo,Lu,Lv = A, V(A,D), V(A,Ab)
Ro,Ru,Rv = D, V(D,C), V(D,Db)
body = (hills() + sun(566,66,24) + shadow(320, 138+58*2+66+16, 300, 17) + house
  + pv_field(pA,pB,pD, 11, 5)
  + f'<polygon points="{pts(A,B,C,D)}" fill="none" stroke="{NAVY}" stroke-width="3" stroke-linejoin="round"/>'
  + "".join(plane_rect(Lo,Lu,Lv, .08+i*.15, .26, .10, .34, op=.7) for i in range(4))
  + plane_rect(Lo,Lu,Lv, .70, .18, .24, .74, fill=WALL_D, stroke=NAVY, sw=2)   # roller door
  + "".join(plane_rect(Lo,Lu,Lv, .70, .22+i*.13, .24, .05, fill=GREY, stroke=None, op=.7) for i in range(5))
  + plane_rect(Ro,Ru,Rv, .10, .24, .58, .30, fill=WALL, stroke=None, op=.5))
write("service-commercial-solar", body)
print("3 scenes rebuilt")

# ── Wall scenes: a device mounted on a wall, for the product-led services ────
def wall_scene(inner=True):
    floor = 322
    wall_c = "#eef4fa" if inner else "#e8eff6"
    s = [f'<rect width="{W}" height="{floor}" fill="{wall_c}"/>',
         f'<rect x="0" y="{floor}" width="{W}" height="{H-floor}" fill="{WALL_D}"/>',
         f'<rect x="0" y="{floor-8}" width="{W}" height="8" fill="{GREY}" opacity=".55"/>']
    if not inner:
        # a hint of eaves and a downpipe, so it reads as outside the house
        s.append(f'<rect x="0" y="0" width="{W}" height="26" fill="{NAVY_2}" opacity=".85"/>')
        s.append(f'<rect x="574" y="26" width="14" height="{floor-26}" rx="4" fill="{GREY}"/>')
    else:
        s.append("".join(f'<line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="{GREY}" stroke-width="1" opacity=".3"/>' for y in (96, 200)))
    return "".join(s)

def unit(x, y, w, h, rx=12, fill=WALL, stroke=NAVY, sw=3, shade=True):
    s = [f'<rect x="{x+5}" y="{y+7}" width="{w}" height="{h}" rx="{rx}" fill="{NAVY}" opacity=".13"/>',
         f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>']
    if shade:
        s.append(f'<path d="M{x} {y+h-rx} v{-(h-2*rx)} a{rx} {rx} 0 0 1 {rx} {-rx} h{w*0.34:.0f} l{-w*0.34:.0f} {h:.0f} z" fill="{SKY_1}" opacity=".35"/>')
    return "".join(s)

def led(cx, cy, c=GREEN):
    return f'<circle cx="{cx}" cy="{cy}" r="6" fill="{c}"/><circle cx="{cx}" cy="{cy}" r="12" fill="{c}" opacity=".22"/>'

def switchboard(x, y, w=86, h=118):
    return (unit(x, y, w, h, rx=8, fill=WALL_S)
            + "".join(f'<rect x="{x+12}" y="{y+18+i*24}" width="{w-24}" height="14" rx="3" fill="{GREY}"/>' for i in range(4))
            + "".join(f'<rect x="{x+16+j*14}" y="{y+20+i*24}" width="8" height="10" rx="2" fill="{NAVY_2}"/>' for i in range(4) for j in range(4)))

# ── service-battery-storage ──────────────────────────────────────────────────
body = (wall_scene() + shadow(300, 330, 190, 12)
  + switchboard(430, 128)
  + unit(178, 96, 168, 216, rx=18)
  + f'<rect x="200" y="122" width="124" height="86" rx="8" fill="{NAVY_2}"/>'
  # charge bars
  + "".join(f'<rect x="{212+i*22}" y="{140}" width="14" height="50" rx="3" fill="{GOLD if i<3 else "#31527a"}"/>' for i in range(5))
  + f'<rect x="200" y="228" width="124" height="10" rx="5" fill="{GREY}"/>'
  + f'<rect x="200" y="248" width="78" height="10" rx="5" fill="{GREY}" opacity=".6"/>'
  + led(310, 282)
  + f'<path d="M346 190 h56 q12 0 12 12 v-28" stroke="{GOLD}" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="8 9"/>'
  + sun(566, 62, 22))
write("service-battery-storage", body)

# ── service-heat-pump-hot-water ──────────────────────────────────────────────
# No capacity printed on the tank: we do not know which unit a given customer
# gets, and a number on an illustration reads as a specification.
def heat_pump_scene(sun_at=(560,72,22), fan_a=0):
    return (wall_scene(inner=False) + shadow(300, 330, 210, 12)
      + f'<rect x="392" y="104" width="118" height="206" rx="26" fill="{NAVY}" opacity=".13"/>'
      + f'<rect x="388" y="98" width="118" height="206" rx="26" fill="{WALL}" stroke="{NAVY}" stroke-width="3"/>'
      + f'<path d="M388 258 v-134 a26 26 0 0 1 26 -26 h28 l-28 160 z" fill="{SKY_1}" opacity=".45"/>'
      + f'<rect x="408" y="252" width="78" height="12" rx="6" fill="{GREY}"/>'
      # water level, as a graphic rather than a figure
      + f'<path d="M404 210 q22 -14 44 0 q22 14 44 0 v72 a14 14 0 0 1 -14 14 h-60 a14 14 0 0 1 -14 -14 z" fill="{GOLD}" opacity=".28"/>'
      + f'<path d="M404 210 q22 -14 44 0 q22 14 44 0" stroke="{GOLD_2}" stroke-width="3" fill="none" stroke-linecap="round"/>'
      + unit(132, 158, 192, 154, rx=16)
      + f'<circle cx="228" cy="235" r="58" fill="{SKY_1}" opacity=".55"/>'
      + f'<circle cx="228" cy="235" r="52" fill="none" stroke="{NAVY}" stroke-width="3"/>'
      + f'<g transform="rotate({fan_a} 228 235)">'
      + "".join(f'<path d="M228 235 q{26*math.cos(math.radians(a)):.0f} {26*math.sin(math.radians(a)):.0f} '
                f'{45*math.cos(math.radians(a+34)):.0f} {45*math.sin(math.radians(a+34)):.0f} '
                f'q{-17*math.cos(math.radians(a)):.0f} {-17*math.sin(math.radians(a)):.0f} '
                f'{-45*math.cos(math.radians(a+34)):.0f} {-45*math.sin(math.radians(a+34)):.0f} z" fill="{NAVY_2}" opacity=".82"/>'
                for a in range(0, 360, 72))
      + f'</g><circle cx="228" cy="235" r="10" fill="{NAVY}"/>'
      + led(298, 182)
      + f'<path d="M328 190 h48 M328 214 h56" stroke="{GOLD}" stroke-width="4" stroke-linecap="round" stroke-dasharray="8 9"/>'
      + sun(*sun_at))
write("service-heat-pump-hot-water", heat_pump_scene())

# ── team-install: installers placing a panel on a roof ───────────────────────
def person(x, y, s=1.0, vest=GOLD, flip=False):
    f = -1 if flip else 1
    return (f'<g transform="translate({x},{y}) scale({f*s},{s})">'
            f'<rect x="-16" y="8" width="13" height="46" rx="6" fill="{NAVY_2}"/>'
            f'<rect x="2" y="8" width="13" height="46" rx="6" fill="{NAVY}"/>'
            f'<rect x="-19" y="-34" width="38" height="48" rx="12" fill="{vest}"/>'
            f'<rect x="-19" y="-22" width="38" height="8" fill="#ffffff" opacity=".75"/>'
            f'<rect x="14" y="-32" width="12" height="40" rx="6" fill="{vest}" transform="rotate(-28 14 -32)"/>'
            f'<circle cx="0" cy="-48" r="15" fill="#f0d7bd"/>'
            f'<path d="M-17 -50 a17 17 0 0 1 34 0 z" fill="{GOLD_2}"/>'
            f'<rect x="-19" y="-52" width="38" height="6" rx="3" fill="{GOLD_2}"/>'
            f'</g>')

house, (A,B,C,D), (Ab,Db,Cb) = iso_house(316, 150, 236, 78, 62)
pA,pB,pD = inset(A,B,C,D, 0.10)
u, v = V(pA,pB), V(pA,pD)
body = (hills() + sun(556, 66, 24) + shadow(316, 150+78*2+62+16, 246, 18) + house
  + pv_field(pA, pB, add(pA, mul(v, .66)), 4, 2)
  + f'<polygon points="{pts(A,B,C,D)}" fill="none" stroke="{NAVY}" stroke-width="3" stroke-linejoin="round"/>'
  # the next panel, held between them
  + plane_rect(add(pA, mul(v,.70)), u, v, .06, 0, .40, .28, fill="url(#pv)", stroke=NAVY, sw=2.5)
  # y is the hip; feet reach +54*scale, so both are placed to land inside the
  # roof polygon rather than through it.
  + person(214, 206, .86)
  + person(398, 224, .86, flip=True)
  + f'<path d="M470 236 q34 34 44 62" stroke="{GOLD}" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="8 10"/>')
write("team-install", body)

# ── work-1..4: the four categories, varied so they do not read as one image ──
b, *_ = scene_house(cx=310, apex=124, half=214, drop=76, wall=80, cols=4, rows=3, sun_at=(548,74,26), inset_m=.11)
write("work-1", b)
write("work-2", (wall_scene() + shadow(316, 330, 200, 12)
  + switchboard(452, 140)
  + unit(166, 92, 176, 224, rx=18)
  + f'<rect x="190" y="120" width="128" height="92" rx="8" fill="{NAVY_2}"/>'
  + "".join(f'<rect x="{202+i*23}" y="{140}" width="15" height="54" rx="3" fill="{GOLD if i<4 else "#31527a"}"/>' for i in range(5))
  + f'<rect x="190" y="232" width="128" height="10" rx="5" fill="{GREY}"/>'
  + f'<rect x="190" y="252" width="82" height="10" rx="5" fill="{GREY}" opacity=".6"/>'
  + led(300, 288)
  + f'<path d="M342 196 h64 q12 0 12 12 v-24" stroke="{GOLD}" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="8 9"/>'
  + sun(568, 60, 20)))
write("work-3", heat_pump_scene(sun_at=(552,68,20), fan_a=26))
house, (A,B,C,D), (Ab,Db,Cb) = iso_house(320, 132, 296, 62, 70, "#22456a")
pA,pB,pD = inset(A,B,C,D, 0.04)
Lo,Lu,Lv = A, V(A,D), V(A,Ab)
write("work-4", (hills() + sun(88, 66, 22) + shadow(320, 132+62*2+70+16, 304, 17) + house
  + pv_field(pA,pB,pD, 12, 6)
  + f'<polygon points="{pts(A,B,C,D)}" fill="none" stroke="{NAVY}" stroke-width="3" stroke-linejoin="round"/>'
  + "".join(plane_rect(Lo,Lu,Lv, .07+i*.13, .28, .09, .32, op=.7) for i in range(5))
  + plane_rect(Lo,Lu,Lv, .74, .20, .20, .70, fill=WALL_D, stroke=NAVY, sw=2)))
print("all illustrations written")

# ── category-inverters: a wall-mounted string inverter ───────────────────────
write("category-inverters", (wall_scene() + shadow(320, 330, 190, 12)
  + unit(196, 78, 248, 238, rx=20)
  + f'<rect x="224" y="106" width="192" height="104" rx="10" fill="{NAVY_2}"/>'
  # a generation curve on the display
  + f'<path d="M240 186 q34 -6 52 -34 q22 -30 44 -30 q26 0 36 34 q8 26 20 30" '
    f'stroke="{GOLD}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  + f'<line x1="240" y1="196" x2="396" y2="196" stroke="{SKY_1}" stroke-width="2" opacity=".45"/>'
  + "".join(f'<rect x="{228+i*46}" y="228" width="34" height="8" rx="4" fill="{GREY}"/>' for i in range(4))
  + led(300, 268) + led(348, 268, GOLD)
  # DC in from the roof, AC out to the board
  + f'<path d="M240 78 v-30 M290 78 v-46" stroke="{NAVY_2}" stroke-width="7" stroke-linecap="round"/>'
  + f'<path d="M444 200 h48 q14 0 14 14 v72" stroke="{GOLD}" stroke-width="4" fill="none" '
    f'stroke-linecap="round" stroke-dasharray="8 9"/>'
  + sun(566, 62, 22)))
print("category-inverters written")

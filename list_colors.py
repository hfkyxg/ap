import flet as ft
print([c for c in dir(ft.Colors) if not c.startswith('_')])

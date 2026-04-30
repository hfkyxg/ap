import flet as ft

class FinanceApp:
    def __init__(self, page: ft.Page):
        self.page = page
        self.page.title = "Finanças"
        self.page.theme_mode = ft.ThemeMode.DARK
        self.page.padding = 0
        self.page.window_width = 400 if self.page.platform == ft.PagePlatform.WINDOWS else None
        self.page.window_height = 800 if self.page.platform == ft.PagePlatform.WINDOWS else None
        
        self.transactions = []
        self.balance = 0.0
        
        self.setup_ui()
        self.load_dummy_data()
        self.update_balance()
    
    def setup_ui(self):
        # Balance display
        self.balance_text = ft.Text("R$ 0,00", size=36, weight=ft.FontWeight.BOLD)
        self.income_text = ft.Text("Receitas: R$ 0,00", size=14, color=ft.Colors.GREEN)
        self.expense_text = ft.Text("Despesas: R$ 0,00", size=14, color=ft.Colors.RED)
        
        # Transaction list
        self.transactions_list = ft.ListView(expand=True, spacing=0, padding=10)
        
        # Bottom navigation
        self.nav_bar = ft.NavigationBar(
            destinations=[
                ft.NavigationBarDestination(icon=ft.Icons.HOME, label="Início"),
                ft.NavigationBarDestination(icon=ft.Icons.LIST, label="Histórico"),
            ],
            on_change=self.nav_change,
        )
        
        # Pages
        self.home_page = ft.SafeArea(
            ft.Column([
                ft.Container(
                    content=ft.Column([
                        ft.Text("Saldo Atual", size=16, color=ft.Colors.ON_SURFACE_VARIANT),
                        self.balance_text,
                        ft.Row([self.income_text, self.expense_text], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                    ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=5),
                    padding=20,
                    bgcolor=ft.Colors.SURFACE_CONTAINER,
                    border_radius=15,
                    margin=10,
                ),
                ft.Container(
                    content=ft.Text("Transações Recentes", size=18, weight=ft.FontWeight.W_500),
                    padding=ft.Padding.only(left=20, top=15, bottom=10),
                ),
                ft.Container(
                    content=self.transactions_list,
                    padding=10,
                    expand=True,
                ),
            ], spacing=5, expand=True),
        )
        
        self.history_page = ft.SafeArea(
            ft.Column([
                ft.Container(
                    content=ft.Text("Histórico Completo", size=20, weight=ft.FontWeight.BOLD),
                    padding=20,
                ),
                ft.Container(
                    content=self.transactions_list,
                    expand=True,
                ),
            ], expand=True),
        )
        
        self.current_page = self.home_page
        self.page.add(
            ft.Column([
                ft.Container(
                    content=self.current_page,
                    expand=True,
                ),
                self.nav_bar,
            ], expand=True)
        )
        
        # FAB for adding transaction
        self.page.floating_action_button = ft.FloatingActionButton(
            icon=ft.Icons.ADD,
            on_click=self.show_add_dialog,
        )
        self.page.floating_action_button_location = ft.FloatingActionButtonLocation.CENTER_DOCKED
    
    def nav_change(self, e):
        if self.nav_bar.selected_index == 0:
            self.current_page = self.home_page
        else:
            self.current_page = self.history_page
        self.page.controls.clear()
        self.page.add(
            ft.Column([
                ft.Container(
                    content=self.current_page,
                    expand=True,
                ),
                self.nav_bar,
            ], expand=True)
        )
        self.page.update()
    
    def load_dummy_data(self):
        dummy = [
            {"type": "Receita", "description": "Salário", "value": 5000.0},
            {"type": "Despesa", "description": "Aluguel", "value": 1500.0},
            {"type": "Despesa", "description": "Supermercado", "value": 450.0},
            {"type": "Receita", "description": "Freelance", "value": 1200.0},
            {"type": "Despesa", "description": "Netflix", "value": 39.9},
        ]
        for d in dummy:
            self.add_transaction_logic(d["type"], d["description"], d["value"])
    
    def add_transaction_logic(self, trans_type, description, value):
        self.transactions.append({
            "type": trans_type,
            "description": description,
            "value": value
        })
        if trans_type == "Receita":
            self.balance += value
        else:
            self.balance -= value
        self.update_balance()
        self.update_transactions_list()
    
    def update_balance(self):
        self.balance_text.value = f"R$ {self.balance:,.2f}"
        self.balance_text.color = ft.Colors.GREEN if self.balance >= 0 else ft.Colors.RED
        
        total_income = sum(t["value"] for t in self.transactions if t["type"] == "Receita")
        total_expense = sum(t["value"] for t in self.transactions if t["type"] == "Despesa")
        self.income_text.value = f"Receitas: R$ {total_income:,.2f}"
        self.expense_text.value = f"Despesas: R$ {total_expense:,.2f}"
    
    def update_transactions_list(self):
        self.transactions_list.controls.clear()
        for t in reversed(self.transactions):
            color = ft.Colors.GREEN if t["type"] == "Receita" else ft.Colors.RED
            self.transactions_list.controls.append(
                ft.Dismissible(
                    content=ft.Container(
                        content=ft.ListTile(
                            leading=ft.Icon(ft.Icons.ARROW_UPWARD if t["type"] == "Receita" else ft.Icons.ARROW_DOWNWARD, color=color),
                            title=ft.Text(t["description"]),
                            subtitle=ft.Text(t["type"]),
                            trailing=ft.Text(f"R$ {t['value']:,.2f}", color=color, weight=ft.FontWeight.BOLD),
                        ),
                        bgcolor=ft.Colors.SURFACE_CONTAINER,
                        border_radius=10,
                        margin=3,
                        padding=5,
                    ),
                    dismiss_direction=ft.DismissDirection.END_TO_START,
                    on_dismiss=self.make_delete_handler(t),
                )
            )
        self.page.update()
    
    def make_delete_handler(self, transaction):
        def handler(e):
            self.transactions.remove(transaction)
            if transaction["type"] == "Receita":
                self.balance -= transaction["value"]
            else:
                self.balance += transaction["value"]
            self.update_balance()
            self.update_transactions_list()
            self.page.show_snack_bar(ft.SnackBar(content=ft.Text("Transação removida"), bgcolor=ft.Colors.RED))
        return handler
    
    def show_add_dialog(self, e):
        desc_input = ft.TextField(label="Descrição", autofocus=True)
        value_input = ft.TextField(label="Valor (R$)", keyboard_type=ft.KeyboardType.NUMBER)
        type_dropdown = ft.Dropdown(
            label="Tipo",
            options=[
                ft.dropdown.Option("Receita"),
                ft.dropdown.Option("Despesa"),
            ],
            value="Receita",
        )
        
        def add_click(e):
            try:
                value = float(value_input.value)
                if value <= 0:
                    self.page.show_snack_bar(ft.SnackBar(content=ft.Text("Valor deve ser maior que zero"), bgcolor=ft.Colors.RED))
                    return
                self.add_transaction_logic(type_dropdown.value, desc_input.value, value)
                self.page.dialog.open = False
                self.page.update()
            except ValueError:
                self.page.show_snack_bar(ft.SnackBar(content=ft.Text("Valor inválido"), bgcolor=ft.Colors.RED))
        
        dialog = ft.AlertDialog(
            title=ft.Text("Nova Transação"),
            content=ft.Column([
                desc_input,
                value_input,
                type_dropdown,
            ], tight=True, spacing=10),
            actions=[
                ft.TextButton("Cancelar", on_click=lambda e: (setattr(self.page.dialog, 'open', False), self.page.update())),
                ft.TextButton("Adicionar", on_click=add_click),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )
        self.page.dialog = dialog
        dialog.open = True
        self.page.update()

def main(page: ft.Page):
    app = FinanceApp(page)

ft.run(main)
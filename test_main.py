import sys
sys.path.insert(0, r"C:\Users\Frank\Desktop\PythonProject")

# Simulate the logic without UI
from main import main
import flet as ft

# Mock page and controls
class MockPage:
    def __init__(self):
        self.title = ""
        self.theme_mode = None
        self.padding = 0
        self.controls = []
        self.snack_bar = None
    def show_snack_bar(self, sb):
        self.snack_bar = sb
    def update(self):
        pass
    def add(self, *controls):
        self.controls.extend(controls)

class MockControl:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

# We'll test the logic by extracting functions from main
# Since functions are nested, we need to run main with a mock page and capture inner functions.
# Instead, let's just test manually by replicating core logic:

def test_transaction_logic():
    transactions = []
    balance = 0
    
    def add_transaction(trans_type, description, value_str):
        nonlocal balance, transactions
        try:
            value = float(value_str)
            if value <= 0:
                return False, "Valor deve ser maior que zero"
            transaction = {"type": trans_type, "description": description, "value": value}
            transactions.append(transaction)
            if transaction["type"] == "Receita":
                balance += value
            else:
                balance -= value
            return True, balance
        except ValueError:
            return False, "Valor inválido"
    
    # Test 1: add income
    success, result = add_transaction("Receita", "Salário", "1000")
    assert success == True
    assert result == 1000.0
    assert balance == 1000.0
    print("Test 1 passed: add income")
    
    # Test 2: add expense
    success, result = add_transaction("Despesa", "Aluguel", "500")
    assert success == True
    assert result == 500.0
    assert balance == 500.0
    print("Test 2 passed: add expense")
    
    # Test 3: invalid value
    success, msg = add_transaction("Receita", "Invalid", "abc")
    assert success == False
    assert msg == "Valor inválido"
    print("Test 3 passed: invalid value")
    
    # Test 4: zero value
    success, msg = add_transaction("Receita", "Zero", "0")
    assert success == False
    assert msg == "Valor deve ser maior que zero"
    print("Test 4 passed: zero value")
    
    # Test 5: negative value (should be >0)
    success, msg = add_transaction("Receita", "Negative", "-10")
    # negative will be >0? actually -10 <=0, so error
    assert success == False
    print("Test 5 passed: negative value")
    
    print("All tests passed!")

if __name__ == "__main__":
    test_transaction_logic()

#define CONSOLE (*(char*)0xC0000000)

void display(const char *str) {
    while (*str) {
        CONSOLE = *str++;
    }
}

void main(void) {
    display("Virgule says\n<< Hello! >>\n");
}

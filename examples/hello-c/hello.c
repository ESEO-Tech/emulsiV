
#define TEXT_OUT (*(char*)0xC0000000)

void print(const char *str) {
    while (*str) {
        TEXT_OUT = *str++;
    }
}

void main(void) {
    print("Virgule says\n<< Hello! >>\n");
}

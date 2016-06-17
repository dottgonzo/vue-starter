var questions = [
    {
        type: 'confirm',
        name: 'toBeDelivered',
        message: 'Is this for delivery?',
        default: false
    },
    {
        type: 'input',
        name: 'phone',
        message: 'What\'s your phone number?',
        validate: function (value) {
            var pass = value.match(/^([01]{1})?[\-\.\s]?\(?(\d{3})\)?[\-\.\s]?(\d{3})[\-\.\s]?(\d{4})\s?((?:#|ext\.?\s?|x\.?\s?){1}(?:\d+)?)?$/i);
            if (pass) {
                return true;
            }
            return 'Please enter a valid phone number';
        }
    },
    {
        type: 'list',
        name: 'size',
        message: 'What size do you need?',
        choices: ['Large', 'Medium', 'Small'],
        filter: function (val) {
            return val.toLowerCase();
        }
    },
    {
        type: 'input',
        name: 'quantity',
        message: 'How many do you need?',
        validate: function (value) {
            var valid = !isNaN(parseFloat(value));
            return valid || 'Please enter a number';
        },
        filter: Number
    },
    {
        type: 'expand',
        name: 'toppings',
        message: 'What about the toppings?',
        choices: [
            {
                key: 'p',
                name: 'Pepperoni and cheese',
                value: 'PepperoniCheese'
            },
            {
                key: 'a',
                name: 'All dressed',
                value: 'alldressed'
            },
            {
                key: 'w',
                name: 'Hawaiian',
                value: 'hawaiian'
            }
        ]
    },
    {
        type: 'rawlist',
        name: 'beverage',
        message: 'You also get a free 2L beverage',
        choices: ['Pepsi', '7up', 'Coke']
    },
    {
        type: 'input',
        name: 'comments',
        message: 'Any comments on your purchase experience?',
        default: 'Nope, all good!'
    },
    {
        type: 'list',
        name: 'prize',
        message: 'For leaving a comment, you get a freebie',
        choices: ['cake', 'fries'],
        when: function (answers) {
            return answers.comments !== 'Nope, all good!';
        }
    }
];

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInEuZXhhbXBsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFrQkEsSUFBSSxTQUFTLEdBQWdCO0lBQzNCO1FBQ0UsSUFBSSxFQUFFLFNBQVM7UUFDZixJQUFJLEVBQUUsZUFBZTtRQUNyQixPQUFPLEVBQUUsdUJBQXVCO1FBQ2hDLE9BQU8sRUFBRSxLQUFLO0tBQ2Y7SUFDRDtRQUNFLElBQUksRUFBRSxPQUFPO1FBQ2IsSUFBSSxFQUFFLE9BQU87UUFDYixPQUFPLEVBQUUsNEJBQTRCO1FBQ3JDLFFBQVEsRUFBRSxVQUFVLEtBQUs7WUFDdkIsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyw2R0FBNkcsQ0FBQyxDQUFDO1lBQ3RJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ1QsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNkLENBQUM7WUFFRCxNQUFNLENBQUMsbUNBQW1DLENBQUM7UUFDN0MsQ0FBQztLQUNGO0lBQ0Q7UUFDRSxJQUFJLEVBQUUsTUFBTTtRQUNaLElBQUksRUFBRSxNQUFNO1FBQ1osT0FBTyxFQUFFLHdCQUF3QjtRQUNqQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQztRQUNyQyxNQUFNLEVBQUUsVUFBVSxHQUFHO1lBQ25CLE1BQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDM0IsQ0FBQztLQUNGO0lBQ0Q7UUFDRSxJQUFJLEVBQUUsT0FBTztRQUNiLElBQUksRUFBRSxVQUFVO1FBQ2hCLE9BQU8sRUFBRSx1QkFBdUI7UUFDaEMsUUFBUSxFQUFFLFVBQVUsS0FBSztZQUN2QixJQUFJLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLENBQUMsS0FBSyxJQUFJLHVCQUF1QixDQUFDO1FBQzFDLENBQUM7UUFDRCxNQUFNLEVBQUUsTUFBTTtLQUNmO0lBQ0Q7UUFDRSxJQUFJLEVBQUUsUUFBUTtRQUNkLElBQUksRUFBRSxVQUFVO1FBQ2hCLE9BQU8sRUFBRSwwQkFBMEI7UUFDbkMsT0FBTyxFQUFFO1lBQ1A7Z0JBQ0UsR0FBRyxFQUFFLEdBQUc7Z0JBQ1IsSUFBSSxFQUFFLHNCQUFzQjtnQkFDNUIsS0FBSyxFQUFFLGlCQUFpQjthQUN6QjtZQUNEO2dCQUNFLEdBQUcsRUFBRSxHQUFHO2dCQUNSLElBQUksRUFBRSxhQUFhO2dCQUNuQixLQUFLLEVBQUUsWUFBWTthQUNwQjtZQUNEO2dCQUNFLEdBQUcsRUFBRSxHQUFHO2dCQUNSLElBQUksRUFBRSxVQUFVO2dCQUNoQixLQUFLLEVBQUUsVUFBVTthQUNsQjtTQUNGO0tBQ0Y7SUFDRDtRQUNFLElBQUksRUFBRSxTQUFTO1FBQ2YsSUFBSSxFQUFFLFVBQVU7UUFDaEIsT0FBTyxFQUFFLGlDQUFpQztRQUMxQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQztLQUNsQztJQUNEO1FBQ0UsSUFBSSxFQUFFLE9BQU87UUFDYixJQUFJLEVBQUUsVUFBVTtRQUNoQixPQUFPLEVBQUUsMkNBQTJDO1FBQ3BELE9BQU8sRUFBRSxpQkFBaUI7S0FDM0I7SUFDRDtRQUNFLElBQUksRUFBRSxNQUFNO1FBQ1osSUFBSSxFQUFFLE9BQU87UUFDYixPQUFPLEVBQUUsMENBQTBDO1FBQ25ELE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUM7UUFDMUIsSUFBSSxFQUFFLFVBQVUsT0FBTztZQUNyQixNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxpQkFBaUIsQ0FBQztRQUNoRCxDQUFDO0tBQ0Y7Q0FDRixDQUFDIiwiZmlsZSI6InEuZXhhbXBsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuXG5cbmludGVyZmFjZSBJcXVlc3Rpb24ge1xuXG4gIHR5cGU6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBtZXNzYWdlOiBzdHJpbmc7XG4gIGNob2ljZXM/OiBhbnlbXTtcbiAgZGVmYXVsdD86IGFueTtcbiAgdmFsaWRhdGU/OiBGdW5jdGlvbjtcbiAgZmlsdGVyPzogYW55O1xuICB3aGVuPzogRnVuY3Rpb247XG5cbn1cblxuXG5cbmxldCBxdWVzdGlvbnMgPSA8SXF1ZXN0aW9uW10+W1xuICB7XG4gICAgdHlwZTogJ2NvbmZpcm0nLFxuICAgIG5hbWU6ICd0b0JlRGVsaXZlcmVkJyxcbiAgICBtZXNzYWdlOiAnSXMgdGhpcyBmb3IgZGVsaXZlcnk/JyxcbiAgICBkZWZhdWx0OiBmYWxzZVxuICB9LFxuICB7XG4gICAgdHlwZTogJ2lucHV0JyxcbiAgICBuYW1lOiAncGhvbmUnLFxuICAgIG1lc3NhZ2U6ICdXaGF0XFwncyB5b3VyIHBob25lIG51bWJlcj8nLFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbiAodmFsdWUpOiBhbnkge1xuICAgICAgdmFyIHBhc3MgPSB2YWx1ZS5tYXRjaCgvXihbMDFdezF9KT9bXFwtXFwuXFxzXT9cXCg/KFxcZHszfSlcXCk/W1xcLVxcLlxcc10/KFxcZHszfSlbXFwtXFwuXFxzXT8oXFxkezR9KVxccz8oKD86I3xleHRcXC4/XFxzP3x4XFwuP1xccz8pezF9KD86XFxkKyk/KT8kL2kpO1xuICAgICAgaWYgKHBhc3MpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAnUGxlYXNlIGVudGVyIGEgdmFsaWQgcGhvbmUgbnVtYmVyJztcbiAgICB9XG4gIH0sXG4gIHtcbiAgICB0eXBlOiAnbGlzdCcsXG4gICAgbmFtZTogJ3NpemUnLFxuICAgIG1lc3NhZ2U6ICdXaGF0IHNpemUgZG8geW91IG5lZWQ/JyxcbiAgICBjaG9pY2VzOiBbJ0xhcmdlJywgJ01lZGl1bScsICdTbWFsbCddLFxuICAgIGZpbHRlcjogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgcmV0dXJuIHZhbC50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgfSxcbiAge1xuICAgIHR5cGU6ICdpbnB1dCcsXG4gICAgbmFtZTogJ3F1YW50aXR5JyxcbiAgICBtZXNzYWdlOiAnSG93IG1hbnkgZG8geW91IG5lZWQ/JyxcbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICB2YXIgdmFsaWQgPSAhaXNOYU4ocGFyc2VGbG9hdCh2YWx1ZSkpO1xuICAgICAgcmV0dXJuIHZhbGlkIHx8ICdQbGVhc2UgZW50ZXIgYSBudW1iZXInO1xuICAgIH0sXG4gICAgZmlsdGVyOiBOdW1iZXJcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdleHBhbmQnLFxuICAgIG5hbWU6ICd0b3BwaW5ncycsXG4gICAgbWVzc2FnZTogJ1doYXQgYWJvdXQgdGhlIHRvcHBpbmdzPycsXG4gICAgY2hvaWNlczogW1xuICAgICAge1xuICAgICAgICBrZXk6ICdwJyxcbiAgICAgICAgbmFtZTogJ1BlcHBlcm9uaSBhbmQgY2hlZXNlJyxcbiAgICAgICAgdmFsdWU6ICdQZXBwZXJvbmlDaGVlc2UnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBrZXk6ICdhJyxcbiAgICAgICAgbmFtZTogJ0FsbCBkcmVzc2VkJyxcbiAgICAgICAgdmFsdWU6ICdhbGxkcmVzc2VkJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAga2V5OiAndycsXG4gICAgICAgIG5hbWU6ICdIYXdhaWlhbicsXG4gICAgICAgIHZhbHVlOiAnaGF3YWlpYW4nXG4gICAgICB9XG4gICAgXVxuICB9LFxuICB7XG4gICAgdHlwZTogJ3Jhd2xpc3QnLFxuICAgIG5hbWU6ICdiZXZlcmFnZScsXG4gICAgbWVzc2FnZTogJ1lvdSBhbHNvIGdldCBhIGZyZWUgMkwgYmV2ZXJhZ2UnLFxuICAgIGNob2ljZXM6IFsnUGVwc2knLCAnN3VwJywgJ0Nva2UnXVxuICB9LFxuICB7XG4gICAgdHlwZTogJ2lucHV0JyxcbiAgICBuYW1lOiAnY29tbWVudHMnLFxuICAgIG1lc3NhZ2U6ICdBbnkgY29tbWVudHMgb24geW91ciBwdXJjaGFzZSBleHBlcmllbmNlPycsXG4gICAgZGVmYXVsdDogJ05vcGUsIGFsbCBnb29kISdcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdsaXN0JyxcbiAgICBuYW1lOiAncHJpemUnLFxuICAgIG1lc3NhZ2U6ICdGb3IgbGVhdmluZyBhIGNvbW1lbnQsIHlvdSBnZXQgYSBmcmVlYmllJyxcbiAgICBjaG9pY2VzOiBbJ2Nha2UnLCAnZnJpZXMnXSxcbiAgICB3aGVuOiBmdW5jdGlvbiAoYW5zd2Vycykge1xuICAgICAgcmV0dXJuIGFuc3dlcnMuY29tbWVudHMgIT09ICdOb3BlLCBhbGwgZ29vZCEnO1xuICAgIH1cbiAgfVxuXTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=

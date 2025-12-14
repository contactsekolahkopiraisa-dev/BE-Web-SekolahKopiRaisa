const mockDelete = jest.fn();
// Default mock implementation
mockDelete.mockResolvedValue(true);

module.exports = {
    deleteFromCloudinaryByUrl: mockDelete,
};
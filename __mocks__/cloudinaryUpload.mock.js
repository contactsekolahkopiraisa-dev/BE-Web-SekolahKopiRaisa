const mockUpload = jest.fn();
// Default mock implementation
mockUpload.mockResolvedValue({ 
    url: 'http://mock-cloudinary.com/uploaded-file.pdf',
    public_id: 'mock-public-id',
    resource_type: 'raw'
});

module.exports = {
    uploadToCloudinary: mockUpload,
};